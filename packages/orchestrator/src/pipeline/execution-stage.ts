import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { RuntimeManager } from "../runtime/runtime-manager"
import { KnowledgeBundle } from "../knowledge/knowledge"

export const runExecutionStage = Effect.fn("Pipeline.execution")(function* (state: PipelineState) {
  const runtimeManager = yield* RuntimeManager.Service

  const tExec = Date.now()
  const runnerOutput = yield* runtimeManager.run({
    graph: state.executionGraph!,
    policy: state.policy!,
    capabilityPlan: state.capabilityPlan!,
    knowledgePlan: state.knowledgePlan,
    knowledgeBundle: KnowledgeBundle.empty(state.classification.type),
    taskObjective: state.input.promptText,
    taskType: state.classification.type,
    repositorySize: state.input.repositorySize,
    sessionID: state.input.sessionID,
  })

  return {
    ...state,
    runtimeOutput: runnerOutput,
    diagnostics: [
      ...state.diagnostics,
      { phase: "specialist-execution", durationMs: Date.now() - tExec, result: `completed=${runnerOutput.completed.length} failed=${runnerOutput.failed.length} cacheHits=${runnerOutput.metrics.cacheHitCount}`, error: undefined },
    ],
  } as PipelineState
})
