export * as LearningMetrics from "./learning-metrics"

import { Context, Effect, Layer, Ref } from "effect"

export interface LearningMetricsData {
  readonly learningCycleCount: number
  readonly optimizedDecisions: number
  readonly strategyReuseCount: number
  readonly planningImprovements: number
  readonly confidenceAdjustments: number
  readonly workflowImprovements: number
  readonly knowledgeFeedbackCount: number
  readonly executionFeedbackCount: number
}

export interface Interface {
  readonly getMetrics: () => Effect.Effect<LearningMetricsData>
  readonly incrementLearningCycleCount: () => Effect.Effect<void>
  readonly incrementOptimizedDecisions: () => Effect.Effect<void>
  readonly incrementStrategyReuseCount: () => Effect.Effect<void>
  readonly incrementPlanningImprovements: () => Effect.Effect<void>
  readonly incrementConfidenceAdjustments: () => Effect.Effect<void>
  readonly incrementWorkflowImprovements: () => Effect.Effect<void>
  readonly incrementKnowledgeFeedbackCount: () => Effect.Effect<void>
  readonly incrementExecutionFeedbackCount: () => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/LearningMetrics") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const initial: LearningMetricsData = {
      learningCycleCount: 0,
      optimizedDecisions: 0,
      strategyReuseCount: 0,
      planningImprovements: 0,
      confidenceAdjustments: 0,
      workflowImprovements: 0,
      knowledgeFeedbackCount: 0,
      executionFeedbackCount: 0,
    }
    const data = yield* Ref.make<LearningMetricsData>(initial)

    const increment = (field: keyof LearningMetricsData): Effect.Effect<void> =>
      Ref.update(data, (d) => ({ ...d, [field]: d[field] + 1 }))

    return Service.of({
      getMetrics: Effect.fn("LearningMetrics.getMetrics")(function* () {
        return yield* Ref.get(data)
      }),
      incrementLearningCycleCount: Effect.fn("LearningMetrics.incrementLearningCycleCount")(function* () {
        yield* increment("learningCycleCount")
      }),
      incrementOptimizedDecisions: Effect.fn("LearningMetrics.incrementOptimizedDecisions")(function* () {
        yield* increment("optimizedDecisions")
      }),
      incrementStrategyReuseCount: Effect.fn("LearningMetrics.incrementStrategyReuseCount")(function* () {
        yield* increment("strategyReuseCount")
      }),
      incrementPlanningImprovements: Effect.fn("LearningMetrics.incrementPlanningImprovements")(function* () {
        yield* increment("planningImprovements")
      }),
      incrementConfidenceAdjustments: Effect.fn("LearningMetrics.incrementConfidenceAdjustments")(function* () {
        yield* increment("confidenceAdjustments")
      }),
      incrementWorkflowImprovements: Effect.fn("LearningMetrics.incrementWorkflowImprovements")(function* () {
        yield* increment("workflowImprovements")
      }),
      incrementKnowledgeFeedbackCount: Effect.fn("LearningMetrics.incrementKnowledgeFeedbackCount")(function* () {
        yield* increment("knowledgeFeedbackCount")
      }),
      incrementExecutionFeedbackCount: Effect.fn("LearningMetrics.incrementExecutionFeedbackCount")(function* () {
        yield* increment("executionFeedbackCount")
      }),
    })
  }),
)

export { layer }
