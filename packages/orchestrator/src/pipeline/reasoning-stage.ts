import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { ReasoningBuilder } from "../reasoning/reasoning-builder"
import { ReasoningMemory } from "../reasoning/reasoning-memory"
import { ContextCompressor } from "../intelligence/context-compressor"
import { RuntimeMetrics } from "../runtime/runtime-metrics"
import { PlanningMemory } from "../planner/planning-memory"

export const runReasoningStage = Effect.fn("Pipeline.reasoning")(function* (state: PipelineState) {
  const reasoningBuilder = yield* ReasoningBuilder.Service
  const reasoningMemory = yield* ReasoningMemory.Service
  const contextCompressor = yield* ContextCompressor.Service
  const runtimeMetrics = yield* RuntimeMetrics.Service
  const memory = yield* PlanningMemory.Service

  yield* reasoningMemory.initialize(state.input.sessionID)

  const tReasonTotal = Date.now()
  const reasoningReport = yield* reasoningBuilder.build(state.executionPackage)
  const reasoningBuildTime = Date.now() - tReasonTotal

  const reasoningState = yield* reasoningMemory.get
  const reusedReasoning = reasoningState.reuseCount > 0

  const reasoningConsensusPoints = [
    ...reasoningReport.consensus.agreements,
    ...reasoningReport.consensus.disagreements,
    ...reasoningReport.consensus.unresolvedQuestions,
  ]
  const reasoningCompression = yield* contextCompressor.compressReasoning(
    reasoningReport.narrative.fullText,
    reasoningConsensusPoints,
    reasoningReport.consensus.recommendations,
  )
  const compressedReasoning = reasoningCompression.savedBytes > 0
  if (compressedReasoning) {
    yield* runtimeMetrics.recordReasoningCompression(reasoningCompression.savedBytes)
    yield* memory.recordReuseSavings(reasoningCompression.savedBytes)
  }

  yield* memory.cacheExecutionPackage(state.executionPackage)

  return {
    ...state,
    executionPackage: {
      ...state.executionPackage,
      executionNarrative: reasoningReport.narrative,
      specialistConsensus: reasoningReport.consensus,
      reasoningSummary: reasoningReport.reasoningSummary,
      reasoningConfidence: reasoningReport.reasoningConfidence,
      reasoningHistory: reasoningState.previousReasoning.slice(-5),
      decisionSummary: reasoningReport.decisions,
      reasoningMetadata: {
        reasoningBuildTimeMs: reasoningBuildTime,
        consensusGenerationTimeMs: reasoningReport.consensusTimeMs,
        narrativeGenerationTimeMs: reasoningReport.narrativeTimeMs,
        decisionEngineTimeMs: reasoningReport.decisionTimeMs,
        reusedReasoning,
        compressedReasoning,
      },
    },
    diagnostics: [
      ...state.diagnostics,
      { phase: "reasoning-layer", durationMs: Date.now() - tReasonTotal, result: `reused=${reusedReasoning} compressed=${compressedReasoning}`, error: undefined },
    ],
  } as PipelineState
})
