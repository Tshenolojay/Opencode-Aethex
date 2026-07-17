export * as SessionIntegration from "./session-integration"

import { Context, Effect, Layer } from "effect"
import type { ExecutionDecision } from "./contracts/execution-decision"
import type { ExecutionPackage } from "./integration/execution-package"
import { ExecutionPackage as ExecutionPackageContract } from "@opencode-ai/schema/execution-package"
import { OrchestratorService } from "./orchestrator"
import type { PhaseEntry } from "./orchestrator"

type ExecutionPackageInfo = typeof ExecutionPackageContract.Info.Type

/**
 * Sole orchestration entry point.
 *
 * Plumbed before SessionRunner.run():
 *   yield* SessionIntegration.decide({ promptText, sessionID, ... })
 *
 * Produces an ExecutionDecision. When continueNormally is true the
 * SessionRunner executes exactly as today — the orchestrator is
 * completely transparent.
 */

export interface IntegrationInput {
  readonly promptText: string
  readonly sessionID: string
  readonly filesAttached: boolean
  readonly conversationLength: number
  readonly repositorySize: number
  readonly contextAvailable: boolean
  readonly previousToolResults: boolean
  readonly sessionMetadata: Record<string, string> | undefined
  readonly assistantResponses: readonly string[] | undefined
  readonly toolResults: readonly string[] | undefined
  readonly projectInfo: string | undefined
}

export interface IntegrationResult {
  readonly decision: ExecutionDecision
  readonly shouldBypass: boolean
}

export interface Interface {
  readonly decide: (input: IntegrationInput) => Effect.Effect<IntegrationResult>
  readonly bypass: (input: IntegrationInput) => Effect.Effect<IntegrationResult>
  readonly integrate: (input: IntegrationInput) => Effect.Effect<ExecutionPackage>
  readonly summary: (pkg: ExecutionPackage) => Effect.Effect<ExecutionPackageInfo>
}

function buildSummary(diagnostics: readonly PhaseEntry[]): {
  readonly totalPlanningTimeMs: number
  readonly phasesCompleted: readonly string[]
} {
  return {
    totalPlanningTimeMs: diagnostics.reduce((acc, e) => acc + e.durationMs, 0),
    phasesCompleted: diagnostics.map((e) => e.phase),
  }
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SessionIntegration") {}

const make = Effect.gen(function* () {
  const orchestrator = yield* OrchestratorService.Service

  const decide = Effect.fn("SessionIntegration.decide")(function* (input: IntegrationInput) {
    const { decision, timing, diagnostics: entries } = yield* orchestrator.orchestrateWithContext({
      promptText: input.promptText,
      sessionID: input.sessionID,
      filesAttached: input.filesAttached,
      conversationLength: input.conversationLength,
      repositorySize: input.repositorySize,
      contextAvailable: input.contextAvailable,
      previousToolResults: input.previousToolResults,
      sessionMetadata: input.sessionMetadata,
      assistantResponses: input.assistantResponses,
      toolResults: input.toolResults,
      projectInfo: input.projectInfo,
    })

    const summary = buildSummary(entries)

    const executionDecision: ExecutionDecision = {
      needsOrchestration: decision.needsOrchestration,
      continueNormally: decision.confidence === "high",
      decision,
      confidenceScore: decision.confidenceScore,
      selectedCapabilities: decision.selectedCapabilities,
      dispatchPlan: decision.dispatchPlan,
      knowledgeRequirements: decision.knowledgeRequirements,
      executionNotes: decision.executionNotes,
      diagnostics: {
        taskType: decision.taskClassification?.type,
        confidence: decision.confidence,
        confidenceScore: decision.confidenceScore?.score,
        capabilities: decision.selectedCapabilities ?? [],
        requiredAgents: decision.dispatchPlan.requiredAgents,
        estimatedSpecialists: decision.dispatchPlan.requiredAgents.length,
        requiresFurtherPlanning: decision.dispatchPlan.requiredAgents.length > 0,
        totalPlanningTimeMs: summary.totalPlanningTimeMs,
        phasesCompleted: summary.phasesCompleted,
      },
      timing,
    }

    return { decision: executionDecision, shouldBypass: executionDecision.continueNormally }
  })

  const integrate = Effect.fn("SessionIntegration.integrate")(function* (input: IntegrationInput) {
    const { executionPackage } = yield* orchestrator.orchestrateWithContext({
      promptText: input.promptText,
      sessionID: input.sessionID,
      filesAttached: input.filesAttached,
      conversationLength: input.conversationLength,
      repositorySize: input.repositorySize,
      contextAvailable: input.contextAvailable,
      previousToolResults: input.previousToolResults,
      sessionMetadata: input.sessionMetadata,
      assistantResponses: input.assistantResponses,
      toolResults: input.toolResults,
      projectInfo: input.projectInfo,
    })
    return executionPackage
  })

  const summary = Effect.fn("SessionIntegration.summary")(function* (pkg: ExecutionPackage) {
    const specialists = pkg.specialistPlan?.selected?.map((match) => ({
      name: match.specialist?.name ?? "unknown",
    }))
    const narrative = pkg.executionNarrative
    const routing = pkg.routingMetadata
    return {
      sessionID: pkg.sessionID as ExecutionPackageInfo["sessionID"],
      timestamp: pkg.timestamp,
      currentTask: narrative?.taskSummary ?? pkg.conversationSummary ?? pkg.taskClassification?.type,
      confidence: pkg.confidence,
      confidenceScore: pkg.confidenceScore?.score,
      status: pkg.executionNotes === undefined ? "idle" : "busy",
      progress: pkg.confidenceScore?.score,
      activeWorkflow: narrative?.recommendedWorkflow,
      specialists: specialists?.length ? specialists : undefined,
      planningSummary: pkg.planningPolicy?.label ?? narrative?.executionStrategy,
      consensusSummary: narrative?.specialistConsensus,
      provider: routing?.selectedProviderID,
      model: routing?.selectedModelID,
      capabilityMatch: pkg.capabilityPlan?.reason,
      routingStrategy: routing?.routingStrategy ?? routing?.routingPolicy,
      fallbackModel: routing?.fallbackModelID,
      repositoryIntelligence: pkg.repositoryIntelligence?.enrichedSummary ?? narrative?.repositoryFindings,
      architectureSummary: pkg.architectureIntelligence?.summary ?? narrative?.architectureFindings,
      dependencySummary: pkg.dependencyIntelligence?.summary ?? narrative?.dependencyFindings,
      documentationSummary: pkg.documentationIntelligence?.summary ?? narrative?.documentationFindings,
      verificationSummary: pkg.verificationIntelligence?.summary ?? narrative?.verificationFindings,
      recommendations: pkg.executionNotes,
      risks: narrative?.risks,
      constraints: narrative?.constraints,
      toolAdvice: pkg.executionIntelligence?.toolAdvice?.suggestedTools,
      workflowSuggestions: narrative?.recommendedWorkflow ? [narrative.recommendedWorkflow] : undefined,
    } satisfies ExecutionPackageInfo
  })

  const bypass = Effect.fn("SessionIntegration.bypass")(function* (input: IntegrationInput) {
    const decision = yield* orchestrator.skip({
      promptText: input.promptText,
      sessionID: input.sessionID,
      filesAttached: input.filesAttached,
      conversationLength: input.conversationLength,
      repositorySize: input.repositorySize,
      contextAvailable: input.contextAvailable,
      previousToolResults: input.previousToolResults,
      sessionMetadata: undefined,
      assistantResponses: undefined,
      toolResults: undefined,
      projectInfo: undefined,
    })

    const executionDecision: ExecutionDecision = {
      needsOrchestration: false,
      continueNormally: true,
      decision,
      confidenceScore: undefined,
      selectedCapabilities: undefined,
      dispatchPlan: decision.dispatchPlan,
      knowledgeRequirements: undefined,
      executionNotes: undefined,
      diagnostics: {
        taskType: undefined,
        confidence: "high",
        confidenceScore: undefined,
        capabilities: [],
        requiredAgents: [],
        estimatedSpecialists: 0,
        requiresFurtherPlanning: false,
        totalPlanningTimeMs: 0,
        phasesCompleted: ["bypass"],
      },
      timing: undefined,
    }

    return { decision: executionDecision, shouldBypass: true }
  })

  return Service.of({ decide, bypass, integrate, summary })
})

const layer = Layer.effect(Service, make)
export { layer }
