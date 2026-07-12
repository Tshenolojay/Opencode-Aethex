export * as SpecialistMemory from "./specialist-memory"

import { Context, Effect, Layer, Ref } from "effect"

export interface SpecialistMemoryData {
  readonly sessionID: string
  readonly previousInvestigations: readonly string[]
  readonly reusableFindings: readonly string[]
  readonly successfulCollaborations: readonly string[]
  readonly specialistReliability: Readonly<Record<string, number>>
  readonly reviewHistory: readonly { readonly reviewerID: string; readonly targetID: string; readonly verdict: string }[]
  readonly reusableStrategies: readonly string[]
}

export interface Interface {
  readonly initialize: (sessionID: string) => Effect.Effect<void>
  readonly addInvestigation: (sessionID: string, investigation: string) => Effect.Effect<void>
  readonly addReusableFinding: (sessionID: string, finding: string) => Effect.Effect<void>
  readonly recordCollaborationSuccess: (sessionID: string, collaboration: string) => Effect.Effect<void>
  readonly recordReliability: (sessionID: string, specialistID: string, score: number) => Effect.Effect<void>
  readonly recordReview: (sessionID: string, reviewerID: string, targetID: string, verdict: string) => Effect.Effect<void>
  readonly addReusableStrategy: (sessionID: string, strategy: string) => Effect.Effect<void>
  readonly get: (sessionID: string) => Effect.Effect<SpecialistMemoryData | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistMemory") {}

function emptyData(sessionID: string): SpecialistMemoryData {
  return {
    sessionID,
    previousInvestigations: [],
    reusableFindings: [],
    successfulCollaborations: [],
    specialistReliability: {},
    reviewHistory: [],
    reusableStrategies: [],
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Map<string, SpecialistMemoryData>>(new Map())

    const update = (sessionID: string, fn: (d: SpecialistMemoryData) => SpecialistMemoryData) =>
      Ref.update(store, (m) => {
        const current = m.get(sessionID) ?? emptyData(sessionID)
        const copy = new Map(m)
        copy.set(sessionID, fn(current))
        return copy
      })

    const initialize = Effect.fn("SpecialistMemory.initialize")(function* (sessionID) {
      yield* Ref.update(store, (m) => {
        if (m.has(sessionID)) return m
        const copy = new Map(m)
        copy.set(sessionID, emptyData(sessionID))
        return copy
      })
    })

    const addInvestigation = Effect.fn("SpecialistMemory.addInvestigation")(function* (sessionID, investigation) {
      yield* update(sessionID, (d) => ({ ...d, previousInvestigations: [...d.previousInvestigations, investigation] }))
    })

    const addReusableFinding = Effect.fn("SpecialistMemory.addReusableFinding")(function* (sessionID, finding) {
      yield* update(sessionID, (d) => ({ ...d, reusableFindings: [...d.reusableFindings, finding] }))
    })

    const recordCollaborationSuccess = Effect.fn("SpecialistMemory.recordCollaborationSuccess")(function* (sessionID, collaboration) {
      yield* update(sessionID, (d) => ({ ...d, successfulCollaborations: [...d.successfulCollaborations, collaboration] }))
    })

    const recordReliability = Effect.fn("SpecialistMemory.recordReliability")(function* (sessionID, specialistID, score) {
      yield* update(sessionID, (d) => ({
        ...d,
        specialistReliability: { ...d.specialistReliability, [specialistID]: score },
      }))
    })

    const recordReview = Effect.fn("SpecialistMemory.recordReview")(function* (sessionID, reviewerID, targetID, verdict) {
      yield* update(sessionID, (d) => ({
        ...d,
        reviewHistory: [...d.reviewHistory, { reviewerID, targetID, verdict }],
      }))
    })

    const addReusableStrategy = Effect.fn("SpecialistMemory.addReusableStrategy")(function* (sessionID, strategy) {
      yield* update(sessionID, (d) => ({ ...d, reusableStrategies: [...d.reusableStrategies, strategy] }))
    })

    const get = Effect.fn("SpecialistMemory.get")(function* (sessionID) {
      return yield* Ref.get(store).pipe(Effect.map((m) => m.get(sessionID)))
    })

    return Service.of({
      initialize, addInvestigation, addReusableFinding, recordCollaborationSuccess,
      recordReliability, recordReview, addReusableStrategy, get,
    })
  }),
)

export { layer }
