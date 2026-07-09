export * as DecisionHistory from "./decision-history"

import { Context, Effect, Layer, Ref } from "effect"

export type DecisionType = "planning" | "confidence" | "workflow" | "specialist" | "connector" | "knowledge" | "execution"
export type OutcomeLabel = "success" | "partial" | "failure"

export interface DecisionRecord {
  readonly sessionID: string
  readonly timestamp: number
  readonly decisionType: DecisionType
  readonly decisionLabel: string
  readonly expectedOutcome: string
  readonly actualOutcome: string
  readonly outcomeLabel: OutcomeLabel
  readonly context: Readonly<Record<string, unknown>>
  readonly metadata: Readonly<Record<string, unknown>>
}

export interface Interface {
  readonly record: (entry: DecisionRecord) => Effect.Effect<void>
  readonly getBySession: (sessionID: string) => Effect.Effect<readonly DecisionRecord[]>
  readonly getByType: (decisionType: DecisionType) => Effect.Effect<readonly DecisionRecord[]>
  readonly getRecent: (count: number) => Effect.Effect<readonly DecisionRecord[]>
  readonly getOutcomesByType: (decisionType: DecisionType) => Effect.Effect<{ success: number; partial: number; failure: number }>
  readonly clearSession: (sessionID: string) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly DecisionRecord[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DecisionHistory") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const data = yield* Ref.make<DecisionRecord[]>([])

    const record: Interface["record"] = Effect.fn("DecisionHistory.record")(function* (entry) {
      yield* Ref.update(data, (records) => [...records, entry])
    })

    const getBySession: Interface["getBySession"] = Effect.fn("DecisionHistory.getBySession")(function* (sessionID) {
      const records = yield* Ref.get(data)
      return records.filter((r) => r.sessionID === sessionID)
    })

    const getByType: Interface["getByType"] = Effect.fn("DecisionHistory.getByType")(function* (decisionType) {
      const records = yield* Ref.get(data)
      return records.filter((r) => r.decisionType === decisionType)
    })

    const getRecent: Interface["getRecent"] = Effect.fn("DecisionHistory.getRecent")(function* (count) {
      const records = yield* Ref.get(data)
      return records.slice(-count)
    })

    const getOutcomesByType: Interface["getOutcomesByType"] = Effect.fn("DecisionHistory.getOutcomesByType")(function* (decisionType) {
      const records = yield* Ref.get(data)
      const filtered = records.filter((r) => r.decisionType === decisionType)
      return {
        success: filtered.filter((r) => r.outcomeLabel === "success").length,
        partial: filtered.filter((r) => r.outcomeLabel === "partial").length,
        failure: filtered.filter((r) => r.outcomeLabel === "failure").length,
      }
    })

    const clearSession: Interface["clearSession"] = Effect.fn("DecisionHistory.clearSession")(function* (sessionID) {
      yield* Ref.update(data, (records) => records.filter((r) => r.sessionID !== sessionID))
    })

    const getAll: Interface["getAll"] = Effect.fn("DecisionHistory.getAll")(function* () {
      return yield* Ref.get(data)
    })

    return Service.of({ record, getBySession, getByType, getRecent, getOutcomesByType, clearSession, getAll })
  }),
)

export { layer }
