export * as ExecutionFeedback from "./execution-feedback"

import { Context, Effect, Layer, Ref } from "effect"

export interface WorkflowStats {
  readonly workflowID: string
  readonly totalExecutions: number
  readonly totalDurationMs: number
  readonly averageDurationMs: number
  readonly successCount: number
  readonly reuseCount: number
  readonly lastExecuted: number
}

export interface Interface {
  readonly recordExecution: (workflowID: string, durationMs: number, success: boolean, reused: boolean) => Effect.Effect<void>
  readonly getWorkflowStats: () => Effect.Effect<readonly WorkflowStats[]>
  readonly getSlowWorkflows: (thresholdMs: number) => Effect.Effect<readonly string[]>
  readonly getReliableWorkflows: (thresholdMs: number) => Effect.Effect<readonly string[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionFeedback") {}

interface ExecutionFeedbackState {
  readonly workflows: Readonly<Record<string, WorkflowStats>>
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const initialState: ExecutionFeedbackState = { workflows: {} }
    const data = yield* Ref.make<ExecutionFeedbackState>(initialState)

    const recordExecution: Interface["recordExecution"] = Effect.fn("ExecutionFeedback.recordExecution")(function* (workflowID, durationMs, success, reused) {
      yield* Ref.update(data, (s) => {
        const existing = s.workflows[workflowID]
        const totalExecutions = (existing?.totalExecutions ?? 0) + 1
        const totalDurationMs = (existing?.totalDurationMs ?? 0) + durationMs
        const successCount = (existing?.successCount ?? 0) + (success ? 1 : 0)
        const reuseCount = (existing?.reuseCount ?? 0) + (reused ? 1 : 0)
        return {
          ...s,
          workflows: {
            ...s.workflows,
            [workflowID]: {
              workflowID,
              totalExecutions,
              totalDurationMs,
              averageDurationMs: totalDurationMs / totalExecutions,
              successCount,
              reuseCount,
              lastExecuted: Date.now(),
            },
          },
        }
      })
    })

    const getWorkflowStats: Interface["getWorkflowStats"] = Effect.fn("ExecutionFeedback.getWorkflowStats")(function* () {
      const s = yield* Ref.get(data)
      return Object.values(s.workflows)
    })

    const getSlowWorkflows: Interface["getSlowWorkflows"] = Effect.fn("ExecutionFeedback.getSlowWorkflows")(function* (thresholdMs) {
      const s = yield* Ref.get(data)
      return Object.values(s.workflows).filter((w) => w.averageDurationMs > thresholdMs).map((w) => w.workflowID)
    })

    const getReliableWorkflows: Interface["getReliableWorkflows"] = Effect.fn("ExecutionFeedback.getReliableWorkflows")(function* (thresholdMs) {
      const s = yield* Ref.get(data)
      return Object.values(s.workflows)
        .filter((w) => w.averageDurationMs <= thresholdMs && w.totalExecutions > 0)
        .map((w) => w.workflowID)
    })

    return Service.of({ recordExecution, getWorkflowStats, getSlowWorkflows, getReliableWorkflows })
  }),
)

export { layer }
