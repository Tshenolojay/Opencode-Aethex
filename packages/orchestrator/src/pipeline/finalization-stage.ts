import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import type { OrchestrationDecision } from "../contracts/service"
import type { Capability } from "../types/capability"
import { AgentDispatcher } from "../dispatcher/dispatcher"
import { KnowledgeBundle } from "../knowledge/knowledge"
import type { TimingInfo } from "../types/metadata"
import { LearningEngine } from "../learning/learning-engine"
import { LearningMetrics } from "../learning/learning-metrics"

export interface PipelineOutput {
  readonly decision: OrchestrationDecision
  readonly timing: TimingInfo
  readonly diagnostics: readonly { phase: string; durationMs: number; result: string; error: string | undefined }[]
  readonly executionGraph: object | undefined
  readonly executionPackage: import("../integration/execution-package").ExecutionPackage
}

export const runFinalizationStage = Effect.fn("Pipeline.finalization")(function* (state: PipelineState) {
  const startTime = state.timing.startTime

  const totalTime = Date.now() - startTime

  const knowledgeTypes: string[] = []
  if (state.classification.requiresSearch) knowledgeTypes.push("search")
  if (state.classification.requiresContext) knowledgeTypes.push("context")
  if (state.classification.requiresDependencyGraph) knowledgeTypes.push("dependency")
  if (state.classification.requiresVerification) knowledgeTypes.push("verification")

  const timing: TimingInfo = {
    startTime,
    classificationEnd: undefined,
    confidenceEnd: undefined,
    dispatchEnd: undefined,
    selectionEnd: undefined,
    planningEnd: startTime + totalTime,
  }

  const diagnostics = [
    ...state.diagnostics,
    { phase: "total", durationMs: totalTime, result: "orchestration-complete", error: undefined },
  ]

  const runnerFailed = state.runtimeOutput?.failed.length ?? 0
  const runnerCompleted = state.runtimeOutput?.completed.length ?? 0

  const decision: OrchestrationDecision = {
    needsOrchestration: (state.dispatchPlan?.requiredAgents.length ?? 0) > 0,
    taskClassification: state.classification,
    confidence: state.confidenceLevel,
    confidenceScore: state.confidenceScore,
    dispatchPlan: state.dispatchPlan ?? AgentDispatcher.emptyDispatchPlan(),
    knowledgeBundle: state.knowledgeBundle,
    executionStatus: runnerCompleted > 0 && runnerFailed === 0
      ? "completed"
      : "collecting",
    skipReason: state.dispatchPlan?.requiredAgents.length === 0
      ? "no specialist agents required"
      : undefined,
    selectedCapabilities: state.requiredCapabilities as readonly Capability[] | undefined,
    knowledgeRequirements: knowledgeTypes.length > 0 ? knowledgeTypes : undefined,
    executionNotes: runnerFailed > 0
      ? [`${runnerFailed} specialist(s) failed during execution`]
      : (state.dispatchPlan?.requiredAgents.length ?? 0) > 0
        ? [`Requires ${state.dispatchPlan?.requiredAgents.join(", ")} agents`]
        : undefined,
    specialistPlan: state.specialistPlan,
    capabilityPlan: state.capabilityPlan,
    knowledgePlan: state.knowledgePlan,
    executionGraph: state.executionGraph,
    planningPolicy: state.policy,
  }

  const learningEngine = yield* LearningEngine.Service

  const tLearn = Date.now()
  yield* learningEngine.observeDecision({
    sessionID: state.input.sessionID,
    timestamp: Date.now(),
    decisionType: "planning",
    decisionLabel: state.policy?.policy ?? "default",
    expectedOutcome: state.confidenceLevel,
    actualOutcome: runnerFailed === 0 ? "success" : runnerFailed > runnerCompleted ? "failure" : "partial",
    outcomeLabel: runnerFailed === 0 ? "success" : runnerFailed > runnerCompleted ? "failure" : "partial",
    context: { taskType: state.classification.type, complexity: state.classification.complexity },
    metadata: { specialistCount: state.specialistPlan?.selected.length ?? 0, connectorCount: state.knowledgePlan?.requests.length ?? 0 },
  })

  yield* learningEngine.observeDecision({
    sessionID: state.input.sessionID,
    timestamp: Date.now(),
    decisionType: "workflow",
    decisionLabel: "orchestration-pipeline",
    expectedOutcome: "completed",
    actualOutcome: runnerFailed === 0 ? "completed" : "partial",
    outcomeLabel: runnerFailed === 0 ? "success" : "failure",
    context: { taskType: state.classification.type },
    metadata: { completed: runnerCompleted, failed: runnerFailed },
  })

  yield* learningEngine.runLearningCycle

  const learningMetrics = yield* LearningMetrics.Service
  const metrics = yield* learningMetrics.getMetrics()
  const learnMs = Date.now() - tLearn

  return {
    decision,
    timing,
    diagnostics: [
      ...diagnostics,
      { phase: "learning-cycle", durationMs: learnMs, result: `cycle=${metrics.learningCycleCount} optimized=${metrics.optimizedDecisions}`, error: undefined },
    ],
    executionGraph: undefined,
    executionPackage: state.executionPackage,
  } as PipelineOutput
})
