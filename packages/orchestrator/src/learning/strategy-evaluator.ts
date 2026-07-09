export * as StrategyEvaluator from "./strategy-evaluator"

import { Context, Effect, Layer } from "effect"
import { DecisionHistory } from "./decision-history"

export interface StrategyVerdict {
  readonly strategy: string
  readonly outcomeLabel: string
  readonly successRate: number
  readonly totalAttempts: number
  readonly averageEffectiveness: number
}

export interface OptimizationRecommendation {
  readonly category: string
  readonly recommendation: string
  readonly confidence: number
  readonly basedOnObservations: number
  readonly potentialImprovement: string
}

export interface EvaluationResult {
  readonly verdicts: readonly StrategyVerdict[]
  readonly recommendations: readonly OptimizationRecommendation[]
  readonly totalEvaluated: number
  readonly timestamp: number
}

export interface Interface {
  readonly evaluateWorkflows: () => Effect.Effect<EvaluationResult>
  readonly evaluateSpecialistSelection: () => Effect.Effect<EvaluationResult>
  readonly evaluateConnectorPlans: () => Effect.Effect<EvaluationResult>
  readonly evaluatePlanningPolicies: () => Effect.Effect<EvaluationResult>
  readonly evaluateAll: () => Effect.Effect<EvaluationResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/StrategyEvaluator") {}

function buildVerdicts(records: readonly import("./decision-history").DecisionRecord[]): readonly StrategyVerdict[] {
  const groups = new Map<string, import("./decision-history").DecisionRecord[]>()
  for (const r of records) {
    const key = r.decisionLabel
    const existing = groups.get(key) ?? []
    existing.push(r)
    groups.set(key, existing)
  }
  return Array.from(groups.entries()).map(([strategy, entries]) => {
    const successCount = entries.filter((e) => e.outcomeLabel === "success").length
    return {
      strategy,
      outcomeLabel: entries.length > 0 ? entries[entries.length - 1]!.outcomeLabel : "unknown",
      successRate: entries.length > 0 ? successCount / entries.length : 0,
      totalAttempts: entries.length,
      averageEffectiveness: successCount / entries.length,
    }
  })
}

function buildRecommendations(verdicts: readonly StrategyVerdict[]): readonly OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = []
  for (const v of verdicts) {
    if (v.successRate < 0.3 && v.totalAttempts >= 2) {
      recommendations.push({
        category: v.strategy,
        recommendation: `Consider deprioritizing "${v.strategy}" (${(v.successRate * 100).toFixed(0)}% success over ${v.totalAttempts} attempts)`,
        confidence: Math.min(v.totalAttempts / 10, 0.9),
        basedOnObservations: v.totalAttempts,
        potentialImprovement: "higher success rate strategy",
      })
    }
    if (v.successRate > 0.8 && v.totalAttempts >= 2) {
      recommendations.push({
        category: v.strategy,
        recommendation: `Prioritize "${v.strategy}" (${(v.successRate * 100).toFixed(0)}% success over ${v.totalAttempts} attempts)`,
        confidence: Math.min(v.totalAttempts / 10, 0.9),
        basedOnObservations: v.totalAttempts,
        potentialImprovement: "continued high success rate",
      })
    }
  }
  return recommendations
}

const evaluateType = (records: readonly import("./decision-history").DecisionRecord[], decisionType: string): EvaluationResult => {
  const verdicts = buildVerdicts(records.filter((r) => r.decisionType === decisionType))
  const recommendations = buildRecommendations(verdicts)
  return {
    verdicts,
    recommendations,
    totalEvaluated: records.length,
    timestamp: Date.now(),
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const history = yield* DecisionHistory.Service

    const evaluateWorkflows: Interface["evaluateWorkflows"] = Effect.fn("StrategyEvaluator.evaluateWorkflows")(function* () {
      const records = yield* history.getByType("workflow")
      return evaluateType(records, "workflow")
    })

    const evaluateSpecialistSelection: Interface["evaluateSpecialistSelection"] = Effect.fn("StrategyEvaluator.evaluateSpecialistSelection")(function* () {
      const records = yield* history.getByType("specialist")
      return evaluateType(records, "specialist")
    })

    const evaluateConnectorPlans: Interface["evaluateConnectorPlans"] = Effect.fn("StrategyEvaluator.evaluateConnectorPlans")(function* () {
      const records = yield* history.getByType("connector")
      return evaluateType(records, "connector")
    })

    const evaluatePlanningPolicies: Interface["evaluatePlanningPolicies"] = Effect.fn("StrategyEvaluator.evaluatePlanningPolicies")(function* () {
      const records = yield* history.getByType("planning")
      return evaluateType(records, "planning")
    })

    const evaluateAll: Interface["evaluateAll"] = Effect.fn("StrategyEvaluator.evaluateAll")(function* () {
      const all = yield* history.getAll()
      const verdicts = buildVerdicts(all)
      const recommendations = buildRecommendations(verdicts)
      return {
        verdicts,
        recommendations,
        totalEvaluated: all.length,
        timestamp: Date.now(),
      }
    })

    return Service.of({ evaluateWorkflows, evaluateSpecialistSelection, evaluateConnectorPlans, evaluatePlanningPolicies, evaluateAll })
  }),
)

export { layer }
