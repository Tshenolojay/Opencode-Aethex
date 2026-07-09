export * as KnowledgeFeedback from "./knowledge-feedback"

import { Context, Effect, Layer, Ref } from "effect"

export interface KnowledgeReuseRecord {
  readonly domain: string
  readonly timesUsed: number
  readonly timesIgnored: number
  readonly timesReused: number
  readonly lastUsed: number
}

export interface Interface {
  readonly recordKnowledgeUse: (domain: string, reused: boolean) => Effect.Effect<void>
  readonly recordKnowledgeIgnored: (domain: string) => Effect.Effect<void>
  readonly getLowValueDomains: (threshold: number) => Effect.Effect<readonly string[]>
  readonly getHighValueDomains: (threshold: number) => Effect.Effect<readonly string[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeFeedback") {}

interface KnowledgeFeedbackState {
  readonly records: Readonly<Record<string, KnowledgeReuseRecord>>
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const initialState: KnowledgeFeedbackState = { records: {} }
    const data = yield* Ref.make<KnowledgeFeedbackState>(initialState)

    const getDomainRecord = (state: KnowledgeFeedbackState, domain: string): KnowledgeReuseRecord =>
      state.records[domain] ?? { domain, timesUsed: 0, timesIgnored: 0, timesReused: 0, lastUsed: 0 }

    const recordKnowledgeUse: Interface["recordKnowledgeUse"] = Effect.fn("KnowledgeFeedback.recordKnowledgeUse")(function* (domain, reused) {
      yield* Ref.update(data, (s) => {
        const rec = getDomainRecord(s, domain)
        return {
          ...s,
          records: {
            ...s.records,
            [domain]: { ...rec, timesUsed: rec.timesUsed + 1, timesReused: rec.timesReused + (reused ? 1 : 0), lastUsed: Date.now() },
          },
        }
      })
    })

    const recordKnowledgeIgnored: Interface["recordKnowledgeIgnored"] = Effect.fn("KnowledgeFeedback.recordKnowledgeIgnored")(function* (domain) {
      yield* Ref.update(data, (s) => {
        const rec = getDomainRecord(s, domain)
        return {
          ...s,
          records: { ...s.records, [domain]: { ...rec, timesIgnored: rec.timesIgnored + 1 } },
        }
      })
    })

    const getLowValueDomains: Interface["getLowValueDomains"] = Effect.fn("KnowledgeFeedback.getLowValueDomains")(function* (threshold) {
      const s = yield* Ref.get(data)
      return Object.values(s.records)
        .filter((r) => r.timesUsed > 0 && r.timesReused / r.timesUsed < threshold)
        .map((r) => r.domain)
    })

    const getHighValueDomains: Interface["getHighValueDomains"] = Effect.fn("KnowledgeFeedback.getHighValueDomains")(function* (threshold) {
      const s = yield* Ref.get(data)
      return Object.values(s.records)
        .filter((r) => r.timesUsed > 0 && r.timesReused / r.timesUsed >= threshold)
        .map((r) => r.domain)
    })

    return Service.of({ recordKnowledgeUse, recordKnowledgeIgnored, getLowValueDomains, getHighValueDomains })
  }),
)

export { layer }
