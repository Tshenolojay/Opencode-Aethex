export * as LearningEngine from "./learning-engine"

import { Context, Effect, Layer } from "effect"
import { DecisionHistory } from "./decision-history"
import type { DecisionRecord } from "./decision-history"
import { StrategyEvaluator } from "./strategy-evaluator"
import type { EvaluationResult } from "./strategy-evaluator"
import { PlanningOptimizer } from "./planning-optimizer"
import type { SpecialistOrderingAdvice } from "./planning-optimizer"
import { ConfidenceLearning } from "./confidence-learning"
import type { ConfidenceAdjustment } from "./confidence-learning"
import { KnowledgeFeedback } from "./knowledge-feedback"
import { ExecutionFeedback } from "./execution-feedback"
import { WorkflowLearning } from "./workflow-learning"
import { LearningMetrics } from "./learning-metrics"
import type { LearningMetricsData } from "./learning-metrics"

export interface LearningCycleResult {
  readonly cycleNumber: number
  readonly evaluationResult: EvaluationResult | undefined
  readonly planningOptimization: SpecialistOrderingAdvice | undefined
  readonly confidenceAdjustments: readonly ConfidenceAdjustment[]
  readonly knowledgeRecommendations: readonly string[]
  readonly workflowRecommendations: string | undefined
  readonly metrics: LearningMetricsData
  readonly timestamp: number
}

export interface Interface {
  readonly runLearningCycle: Effect.Effect<LearningCycleResult>
  readonly observeDecision: (entry: DecisionRecord) => Effect.Effect<void>
  readonly getMetrics: Effect.Effect<LearningMetricsData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/LearningEngine") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const history = yield* DecisionHistory.Service
    const strategyEvaluator = yield* StrategyEvaluator.Service
    const planningOptimizer = yield* PlanningOptimizer.Service
    const confidenceLearning = yield* ConfidenceLearning.Service
    const knowledgeFeedback = yield* KnowledgeFeedback.Service
    const executionFeedback = yield* ExecutionFeedback.Service
    const workflowLearning = yield* WorkflowLearning.Service
    const learningMetrics = yield* LearningMetrics.Service

    const runLearningCycle = Effect.gen(function* () {
      yield* learningMetrics.incrementLearningCycleCount()

      const evaluationResult = yield* strategyEvaluator.evaluateAll()
      const planningOptimization = yield* planningOptimizer.getSpecialistOrderingAdvice()
      const confidenceAdjustments = yield* confidenceLearning.getConfidenceAdjustments()
      const lowValueDomains = yield* knowledgeFeedback.getLowValueDomains(0.2)
      const highValueDomains = yield* knowledgeFeedback.getHighValueDomains(0.8)
      const recommendedWorkflow = yield* workflowLearning.recommendBestWorkflow("general")

      if (evaluationResult.recommendations.length > 0) {
        yield* learningMetrics.incrementOptimizedDecisions()
      }
      if (planningOptimization.suggestions.length > 0) {
        yield* learningMetrics.incrementPlanningImprovements()
      }
      if (confidenceAdjustments.length > 0) {
        yield* learningMetrics.incrementConfidenceAdjustments()
      }
      if (lowValueDomains.length > 0 || highValueDomains.length > 0) {
        yield* learningMetrics.incrementKnowledgeFeedbackCount()
      }
      if (recommendedWorkflow) {
        yield* learningMetrics.incrementWorkflowImprovements()
      }

      const metrics = yield* learningMetrics.getMetrics()

      return {
        cycleNumber: metrics.learningCycleCount,
        evaluationResult,
        planningOptimization,
        confidenceAdjustments,
        knowledgeRecommendations: [...lowValueDomains, ...highValueDomains],
        workflowRecommendations: recommendedWorkflow,
        metrics,
        timestamp: Date.now(),
      } satisfies LearningCycleResult
    })

    return Service.of({
      runLearningCycle,
      observeDecision: (entry: DecisionRecord) => history.record(entry),
      getMetrics: learningMetrics.getMetrics(),
    })
  }),
)

export { layer }
