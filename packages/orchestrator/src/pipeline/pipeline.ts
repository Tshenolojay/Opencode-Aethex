export * as Pipeline from "./pipeline"

import { Effect, Schema } from "effect"
import type { OrchestrationInput, OrchestrationDecision } from "../contracts/service"
import { TaskClassification as TaskClassificationSchema, type ClassificationResult } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceScore } from "../types/confidence"
import type { PhaseEntry } from "../orchestrator"
import type { TimingInfo } from "../types/metadata"
type TaskClassification = Schema.Schema.Type<typeof TaskClassificationSchema>
import { runFoundationStage } from "./foundation-stage"
import { runPlanningStage } from "./planning-stage"
import { runExecutionStage } from "./execution-stage"
import { runIntelligenceStage } from "./intelligence-stage"
import { runIntegrationStage } from "./integration-stage"
import { runReasoningStage } from "./reasoning-stage"
import { runConnectorStage } from "./connector-stage"
import { runTeamStage } from "./team-stage"
import { runCollaborationStage } from "./collaboration-stage"
import { runFinalizationStage, type PipelineOutput } from "./finalization-stage"
import { KnowledgeBundle } from "../knowledge/knowledge"
import { AgentDispatcher } from "../dispatcher/dispatcher"

export interface PipelineState {
  input: OrchestrationInput
  diagnostics: PhaseEntry[]
  timing: TimingInfo

  classification: TaskClassification
  classifications: readonly ClassificationResult[]
  confidenceLevel: ConfidenceLevel
  confidenceScore: ConfidenceScore | undefined

  capabilityPlan: import("../planner/capability-planner").CapabilityPlan | undefined
  requiredCapabilities: readonly string[] | undefined
  specialistPlan: import("../dispatcher/dispatcher").SpecialistPlan | undefined
  dispatchPlan: import("../dispatcher/dispatcher").DispatchPlan | undefined
  knowledgePlan: import("../planner/knowledge-planner").KnowledgePlan | undefined
  policy: import("../planner/planning-policy").PlanningPolicy | undefined
  executionGraph: import("../planner/execution-graph").Graph | undefined

  runtimeOutput: import("../runtime/runtime-manager").RuntimeManagerOutput | undefined
  knowledgeBundle: import("../knowledge/knowledge").KnowledgeBundle

  repoAnalysis: import("../intelligence/repository-intelligence").RepositoryAnalysis | undefined
  depAnalysis: import("../intelligence/dependency-intelligence").DependencyAnalysis | undefined
  archAnalysis: import("../intelligence/architecture-intelligence").ArchitectureAnalysis | undefined
  docAnalysis: import("../intelligence/documentation-intelligence").DocumentationAnalysis | undefined
  verAnalysis: import("../intelligence/verification-intelligence").VerificationAnalysis | undefined
  ctxReport: import("../intelligence/context-intelligence").ContextQualityReport | undefined

  executionPackage: import("../integration/execution-package").ExecutionPackage

  virtualTeam: import("../integration/execution-package").VirtualTeam | undefined
  taskGraph: import("../integration/execution-package").TaskGraph | undefined
  workAssignments: import("../integration/execution-package").WorkAssignments | undefined
  teamDiscussion: import("../integration/execution-package").TeamDiscussion | undefined
  reviewPipeline: import("../integration/execution-package").ReviewPipeline | undefined
  capabilityMarketplace: import("../integration/execution-package").CapabilityMarketplace | undefined
  teamPlan: import("../integration/execution-package").TeamPlan | undefined
}

export function createInitialState(input: OrchestrationInput): PipelineState {
  const now = Date.now()
  return {
    input,
    diagnostics: [],
    timing: { startTime: now, classificationEnd: undefined, confidenceEnd: undefined, dispatchEnd: undefined, selectionEnd: undefined, planningEnd: undefined },

    classification: { type: "general-chat", complexity: 0, requiresContext: true, requiresSearch: false, requiresDependencyGraph: false, requiresVerification: false, confidence: "high" },
    classifications: [],
    confidenceLevel: "high",
    confidenceScore: undefined,

    capabilityPlan: undefined,
    requiredCapabilities: undefined,
    specialistPlan: undefined,
    dispatchPlan: undefined,
    knowledgePlan: undefined,
    policy: undefined,
    executionGraph: undefined,

    runtimeOutput: undefined,
    knowledgeBundle: KnowledgeBundle.empty("general-chat"),

    repoAnalysis: undefined,
    depAnalysis: undefined,
    archAnalysis: undefined,
    docAnalysis: undefined,
    verAnalysis: undefined,
    ctxReport: undefined,

    executionPackage: {
      sessionID: input.sessionID,
      timestamp: now,
      taskClassification: { type: "general-chat", complexity: 0, requiresContext: true, requiresSearch: false, requiresDependencyGraph: false, requiresVerification: false, confidence: "high" },
      classifications: [],
      confidence: "high",
      confidenceScore: undefined,
      capabilityPlan: undefined,
      specialistPlan: undefined,
      knowledgePlan: undefined,
      dispatchPlan: undefined,
      planningPolicy: undefined,
      executionGraph: undefined,
      knowledgeBundle: KnowledgeBundle.empty("general-chat"),
      repositoryIntelligence: undefined,
      dependencyIntelligence: undefined,
      architectureIntelligence: undefined,
      documentationIntelligence: undefined,
      verificationIntelligence: undefined,
      contextIntelligence: undefined,
      conversationSummary: undefined,
      modelRecommendation: undefined,
      runtimeMetrics: undefined,
      executionNotes: undefined,
      agentSelectionAdvice: undefined,
      agentContextProfile: undefined,
      agentHints: undefined,
      promptAugmentation: undefined,
      executionIntelligence: undefined,
      compressedContext: undefined,
      executionNarrative: undefined,
      specialistConsensus: undefined,
      reasoningSummary: undefined,
      reasoningConfidence: undefined,
      reasoningHistory: undefined,
      decisionSummary: undefined,
      reasoningMetadata: undefined,
      virtualTeam: undefined,
      teamPlan: undefined,
      taskGraph: undefined,
      workAssignments: undefined,
      teamDiscussion: undefined,
      reviewPipeline: undefined,
      capabilityMarketplace: undefined,
      workspaceSummaries: undefined,
      connectorPlan: undefined,
      knowledgeSources: undefined,
      connectorResults: undefined,
      connectorMetadata: undefined,
      reusableKnowledgeSources: undefined,
      applicationProfile: undefined,
      applicationSummary: undefined,
      workflowCatalog: undefined,
      capabilityCatalog: undefined,
      serviceCatalog: undefined,
      moduleCatalog: undefined,
      intelligenceReport: undefined,
      collaboration: undefined,
    },

    virtualTeam: undefined,
    taskGraph: undefined,
    workAssignments: undefined,
    teamDiscussion: undefined,
    reviewPipeline: undefined,
    capabilityMarketplace: undefined,
    teamPlan: undefined,
  }
}

export type StageFn = (state: PipelineState) => Effect.Effect<PipelineState>

const stages: StageFn[] = [
  runFoundationStage as StageFn,
  runPlanningStage as StageFn,
  runExecutionStage as StageFn,
  runIntelligenceStage as StageFn,
  runIntegrationStage as StageFn,
  runReasoningStage as StageFn,
  runConnectorStage as StageFn,
  runTeamStage as StageFn,
  runCollaborationStage as StageFn,
]

export function runAllStages(input: OrchestrationInput): Effect.Effect<PipelineOutput> {
  return Effect.fn("Pipeline.runAllStages")(function* () {
    let state = createInitialState(input)

    for (const stage of stages) {
      const tStage = Date.now()
      state = yield* stage(state).pipe(
        Effect.catchIf(() => true, (error: unknown) =>
          Effect.succeed({
            ...state,
            diagnostics: [
              ...state.diagnostics,
              { phase: stage.name || "unknown", durationMs: Date.now() - tStage, result: "failed", error: String(error) },
            ],
          } as PipelineState)
        ),
      )
    }

    const highConfidence = state.confidenceLevel === "high"
    if (highConfidence && state.dispatchPlan) {
      return yield* buildHighConfidenceOutput(state)
    }

    return yield* runFinalizationStage(state)
  }) as unknown as Effect.Effect<PipelineOutput, never, never>
}

function buildHighConfidenceOutput(state: PipelineState): Effect.Effect<PipelineOutput> {
  return Effect.succeed({
    decision: {
      needsOrchestration: false,
      taskClassification: state.classification,
      confidence: state.confidenceLevel,
      confidenceScore: state.confidenceScore,
      dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
      knowledgeBundle: KnowledgeBundle.empty(state.classification.type),
      executionStatus: "completed",
      skipReason: "high confidence — no specialist agents needed",
      selectedCapabilities: undefined,
      knowledgeRequirements: undefined,
      executionNotes: undefined,
      specialistPlan: undefined,
      capabilityPlan: undefined,
      knowledgePlan: undefined,
      executionGraph: undefined,
      planningPolicy: undefined,
    },
    timing: state.timing,
    diagnostics: [
      ...state.diagnostics,
      { phase: "total", durationMs: Date.now() - state.timing.startTime, result: "bypass-high-confidence", error: undefined },
    ],
    executionGraph: undefined,
    executionPackage: state.executionPackage,
  } as PipelineOutput)
}
