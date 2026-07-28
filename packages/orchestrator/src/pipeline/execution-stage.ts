import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { RuntimeManager } from "../runtime/runtime-manager"
import { KnowledgeBundle } from "../knowledge/knowledge"

export const runExecutionStage = Effect.fn("Pipeline.execution")(function* (state: PipelineState) {
  if (!state.policy?.requiresSpecialists || !state.executionGraph?.nodes.length) {
    return {
      ...state,
      diagnostics: [
        ...state.diagnostics,
        {
          phase: "specialist-execution",
          durationMs: 0,
          result: state.policy?.requiresSpecialists ? "skipped-empty-graph" : "skipped-high-confidence",
          error: undefined,
        },
      ],
    } as PipelineState
  }

  const runtimeManager = yield* Effect.serviceOption(RuntimeManager.Service)
  if (runtimeManager._tag === "None") {
    // RuntimeManager lives in a late tier that may not cross-merge; specialists remain planned
    // and model assignment still happens via SpecialistExecutor when the runtime is present.
    return {
      ...state,
      diagnostics: [
        ...state.diagnostics,
        {
          phase: "specialist-execution",
          durationMs: 0,
          result: `planned=${state.specialistPlan?.selected.length ?? 0} (runtime deferred)`,
          error: undefined,
        },
      ],
    } as PipelineState
  }

  const tExec = Date.now()
  const runnerOutput = yield* runtimeManager.value.run({
    graph: state.executionGraph,
    policy: state.policy,
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
      {
        phase: "specialist-execution",
        durationMs: Date.now() - tExec,
        result: `completed=${runnerOutput.completed.length} failed=${runnerOutput.failed.length} cacheHits=${runnerOutput.metrics.cacheHitCount}`,
        error: undefined,
      },
    ],
  } as PipelineState
})
