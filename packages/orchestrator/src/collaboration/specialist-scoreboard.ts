export * as SpecialistScoreboard from "./specialist-scoreboard"

import { Context, Effect, Layer, Ref } from "effect"
import type { Scoreboard, ScoreboardEntry } from "../integration/collaboration-result"

interface InternalEntry {
  readonly specialistID: string
  readonly name: string
  readonly participation: number
  readonly contributions: number
  readonly acceptedRecommendations: number
  readonly rejectedRecommendations: number
  readonly reviewAccuracySum: number
  readonly reviewAccuracyCount: number
  readonly consensusParticipation: number
  readonly reusableKnowledge: number
  readonly reliabilitySum: number
  readonly reliabilityCount: number
}

export interface Interface {
  readonly recordParticipation: (specialistID: string, name: string) => Effect.Effect<void>
  readonly recordContribution: (specialistID: string, name: string) => Effect.Effect<void>
  readonly recordRecommendation: (specialistID: string, name: string, accepted: boolean) => Effect.Effect<void>
  readonly recordReview: (specialistID: string, name: string, accurate: boolean) => Effect.Effect<void>
  readonly recordConsensus: (specialistID: string, name: string) => Effect.Effect<void>
  readonly recordReusableKnowledge: (specialistID: string, name: string) => Effect.Effect<void>
  readonly recordReliability: (specialistID: string, name: string, score: number) => Effect.Effect<void>
  readonly getScoreboard: () => Effect.Effect<Scoreboard>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistScoreboard") {}

function emptyEntry(specialistID: string, name: string): InternalEntry {
  return {
    specialistID, name,
    participation: 0, contributions: 0,
    acceptedRecommendations: 0, rejectedRecommendations: 0,
    reviewAccuracySum: 0, reviewAccuracyCount: 0,
    consensusParticipation: 0, reusableKnowledge: 0,
    reliabilitySum: 0, reliabilityCount: 0,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Map<string, InternalEntry>>(new Map())

    const upsert = (specialistID: string, name: string, fn: (e: InternalEntry) => InternalEntry) =>
      Ref.update(store, (m) => {
        const current = m.get(specialistID) ?? emptyEntry(specialistID, name)
        const next = fn(current)
        const copy = new Map(m)
        copy.set(specialistID, next)
        return copy
      })

    const recordParticipation = Effect.fn("SpecialistScoreboard.recordParticipation")(function* (specialistID, name) {
      yield* upsert(specialistID, name, (e) => ({ ...e, participation: e.participation + 1 }))
    })

    const recordContribution = Effect.fn("SpecialistScoreboard.recordContribution")(function* (specialistID, name) {
      yield* upsert(specialistID, name, (e) => ({ ...e, contributions: e.contributions + 1 }))
    })

    const recordRecommendation = Effect.fn("SpecialistScoreboard.recordRecommendation")(function* (specialistID, name, accepted) {
      yield* upsert(specialistID, name, (e) => ({
        ...e,
        acceptedRecommendations: e.acceptedRecommendations + (accepted ? 1 : 0),
        rejectedRecommendations: e.rejectedRecommendations + (accepted ? 0 : 1),
      }))
    })

    const recordReview = Effect.fn("SpecialistScoreboard.recordReview")(function* (specialistID, name, accurate) {
      yield* upsert(specialistID, name, (e) => ({
        ...e,
        reviewAccuracySum: e.reviewAccuracySum + (accurate ? 1 : 0),
        reviewAccuracyCount: e.reviewAccuracyCount + 1,
      }))
    })

    const recordConsensus = Effect.fn("SpecialistScoreboard.recordConsensus")(function* (specialistID, name) {
      yield* upsert(specialistID, name, (e) => ({ ...e, consensusParticipation: e.consensusParticipation + 1 }))
    })

    const recordReusableKnowledge = Effect.fn("SpecialistScoreboard.recordReusableKnowledge")(function* (specialistID, name) {
      yield* upsert(specialistID, name, (e) => ({ ...e, reusableKnowledge: e.reusableKnowledge + 1 }))
    })

    const recordReliability = Effect.fn("SpecialistScoreboard.recordReliability")(function* (specialistID, name, score) {
      yield* upsert(specialistID, name, (e) => ({
        ...e,
        reliabilitySum: e.reliabilitySum + score,
        reliabilityCount: e.reliabilityCount + 1,
      }))
    })

    const getScoreboard = Effect.fn("SpecialistScoreboard.getScoreboard")(function* () {
      const map = yield* Ref.get(store)
      const entries: ScoreboardEntry[] = [...map.values()].map((e) => ({
        specialistID: e.specialistID,
        name: e.name,
        participation: e.participation,
        contributions: e.contributions,
        acceptedRecommendations: e.acceptedRecommendations,
        rejectedRecommendations: e.rejectedRecommendations,
        reviewAccuracy: e.reviewAccuracyCount > 0 ? e.reviewAccuracySum / e.reviewAccuracyCount : 0,
        consensusParticipation: e.consensusParticipation,
        reusableKnowledge: e.reusableKnowledge,
        reliabilityScore: e.reliabilityCount > 0 ? e.reliabilitySum / e.reliabilityCount : 0,
      }))
      const topContributor = entries.length === 0
        ? undefined
        : entries.reduce((a, b) => (a.contributions + a.participation > b.contributions + b.participation ? a : b)).specialistID
      const averageReliability = entries.length === 0
        ? 0
        : entries.reduce((s, e) => s + e.reliabilityScore, 0) / entries.length
      return { entries, topContributor, averageReliability }
    })

    return Service.of({
      recordParticipation, recordContribution, recordRecommendation,
      recordReview, recordConsensus, recordReusableKnowledge, recordReliability, getScoreboard,
    })
  }),
)

export { layer }
