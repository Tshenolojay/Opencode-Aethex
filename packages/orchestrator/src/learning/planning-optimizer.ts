export * as PlanningOptimizer from "./planning-optimizer"

import { Context, Effect, Layer } from "effect"
import { DecisionHistory } from "./decision-history"

export interface OrderingSuggestion {
  readonly item: string
  readonly currentPosition: number
  readonly suggestedPosition: number
  readonly reason: string
  readonly confidence: number
}

export interface SpecialistOrderingAdvice {
  readonly suggestions: readonly OrderingSuggestion[]
  readonly workflowOrderAdvice: readonly string[]
  readonly connectorOrderAdvice: readonly string[]
  readonly timestamp: number
}

export interface Interface {
  readonly getSpecialistOrderingAdvice: () => Effect.Effect<SpecialistOrderingAdvice>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PlanningOptimizer") {}

function rankBySuccessRate(records: readonly import("./decision-history").DecisionRecord[], decisionType: string): readonly string[] {
  const groups = new Map<string, { success: number; total: number }>()
  for (const r of records) {
    if (r.decisionType !== decisionType) continue
    const entry = groups.get(r.decisionLabel) ?? { success: 0, total: 0 }
    entry.total++
    if (r.outcomeLabel === "success") entry.success++
    groups.set(r.decisionLabel, entry)
  }
  return Array.from(groups.entries())
    .sort((a, b) => (b[1].success / Math.max(b[1].total, 1)) - (a[1].success / Math.max(a[1].total, 1)))
    .map(([label]) => label)
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const history = yield* DecisionHistory.Service

    const getSpecialistOrderingAdvice: Interface["getSpecialistOrderingAdvice"] = Effect.fn("PlanningOptimizer.getSpecialistOrderingAdvice")(function* () {
      const allRecords = yield* history.getAll()
      const specialistRanking = rankBySuccessRate(allRecords, "specialist")
      const workflowRanking = rankBySuccessRate(allRecords, "workflow")
      const connectorRanking = rankBySuccessRate(allRecords, "connector")

      const suggestions: OrderingSuggestion[] = specialistRanking.map((name, index) => ({
        item: name,
        currentPosition: index,
        suggestedPosition: index,
        reason: `ranked by historical success rate`,
        confidence: 0.7,
      }))

      return {
        suggestions,
        workflowOrderAdvice: workflowRanking,
        connectorOrderAdvice: connectorRanking,
        timestamp: Date.now(),
      }
    })

    return Service.of({ getSpecialistOrderingAdvice })
  }),
)

export { layer }
