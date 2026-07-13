import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import type { Capability } from "../types/capability"
import { SelectionEngine } from "../resources/selection-engine"
import { ProviderHealth } from "../resources/provider-health"
import { BenchmarkStore } from "../resources/benchmark-store"
import { RuntimeMetrics } from "../runtime/runtime-metrics"
import { empty as emptyContext, type OrchestrationContext } from "../state/context"

function buildContext(state: PipelineState): OrchestrationContext {
  const ctx = emptyContext(state.input.sessionID)
  return {
    ...ctx,
    taskClassification: state.classification,
    classifications: state.classifications,
    confidenceLevel: state.confidenceLevel,
    confidenceScore: state.confidenceScore,
    selectedCapabilities: (state.requiredCapabilities ?? []) as readonly Capability[],
  }
}

export const runResourceStage = Effect.fn("Pipeline.resource-management")(function* (state: PipelineState) {
  const t0 = Date.now()
  const capRegistry = state.requiredCapabilities ?? []

  if (capRegistry.length === 0) {
    return {
      ...state,
      diagnostics: [
        ...state.diagnostics,
        { phase: "resource-management", durationMs: Date.now() - t0, result: "skipped-no-capabilities", error: undefined },
      ],
    } as PipelineState
  }

  const selectionEngine = yield* SelectionEngine.Service
  const providerHealth = yield* ProviderHealth.Service
  const benchmarkStore = yield* BenchmarkStore.Service
  const runtimeMetrics = yield* RuntimeMetrics.Service

  const ctx = buildContext(state)

  const selection = yield* selectionEngine.selectForOrchestration(ctx)
  if (!selection) {
    return {
      ...state,
      diagnostics: [
        ...state.diagnostics,
        { phase: "resource-management", durationMs: Date.now() - t0, result: "no-suitable-model", error: undefined },
      ],
    } as PipelineState
  }
  const chain = selection.fallbackChain

  const healthSnapshot = yield* providerHealth.snapshot()
  const providerHealthScore = healthSnapshot.providers.get(selection.providerID)?.healthScore

  const benchmarkSummary = yield* benchmarkStore.getModelSummaries(selection.providerID, selection.modelID)

  const routingMetadata = {
    selectedProviderID: selection.providerID,
    selectedModelID: selection.modelID,
    fallbackProviderID: chain.secondary?.providerID,
    fallbackModelID: chain.secondary?.modelID,
    tertiaryProviderID: chain.tertiary?.providerID,
    tertiaryModelID: chain.tertiary?.modelID,
    routingStrategy: selection.strategy,
    routingPolicy: selection.strategy,
    selectionConfidence: selection.confidence,
    selectionReasoning: selection.reasoning,
    capabilityFitScore: chain.primary.fitScore,
    estimatedCostPerToken: undefined,
    estimatedCost: undefined,
    estimatedContext: selection.requirements.estimatedContextTokens,
    estimatedTokens: selection.requirements.estimatedContextTokens,
    estimatedLatencyMs: undefined,
    providerHealthScore,
    providerHealthSnapshot: Object.fromEntries(healthSnapshot.providers),
    benchmarkSummary: benchmarkSummary as unknown as Readonly<Record<string, unknown>>,
  }

  yield* runtimeMetrics.recordResourceSelection(Date.now() - t0)
  yield* runtimeMetrics.recordResourceCapabilityMatch()

  return {
    ...state,
    executionPackage: {
      ...state.executionPackage,
      routingMetadata,
    },
    diagnostics: [
      ...state.diagnostics,
      {
        phase: "resource-management",
        durationMs: Date.now() - t0,
        result: `selected ${selection.providerID}/${selection.modelID} via ${selection.strategy}`,
        error: undefined,
      },
    ],
  } as PipelineState
})
