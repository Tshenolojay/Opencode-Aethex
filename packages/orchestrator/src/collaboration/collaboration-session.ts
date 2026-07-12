export * as CollaborationSession from "./collaboration-session"

import { Context, Effect, Layer, Ref } from "effect"
import type { CollaborationPolicyType, CollaborationSessionData, CollaborationMessage } from "../integration/collaboration-result"

export interface Interface {
  readonly create: (sessionID: string, participants: readonly string[], assignedModels: Readonly<Record<string, string>>, strategy: CollaborationPolicyType) => Effect.Effect<void>
  readonly addMessage: (sessionID: string, message: CollaborationMessage) => Effect.Effect<void>
  readonly addKnowledge: (sessionID: string, knowledgeID: string) => Effect.Effect<void>
  readonly addReview: (sessionID: string, reviewID: string) => Effect.Effect<void>
  readonly setConsensus: (sessionID: string, state: CollaborationSessionData["consensusState"]) => Effect.Effect<void>
  readonly addUnresolved: (sessionID: string, question: string) => Effect.Effect<void>
  readonly complete: (sessionID: string) => Effect.Effect<void>
  readonly get: (sessionID: string) => Effect.Effect<CollaborationSessionData | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CollaborationSession") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Map<string, CollaborationSessionData>>(new Map())

    const create = Effect.fn("CollaborationSession.create")(function* (sessionID, participants, assignedModels, strategy) {
      yield* Ref.update(store, (m) => {
        if (m.has(sessionID)) return m
        const copy = new Map(m)
        copy.set(sessionID, {
          sessionID,
          startedAt: Date.now(),
          completedAt: undefined,
          participants,
          assignedModels,
          strategy,
          roundCount: 0,
          discussionHistory: [],
          knowledgeExchanged: [],
          reviewHistory: [],
          consensusState: "pending",
          unresolvedQuestions: [],
        })
        return copy
      })
    })

    const addMessage = Effect.fn("CollaborationSession.addMessage")(function* (sessionID, message) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, {
          ...s,
          roundCount: message.type === "recommendation" ? s.roundCount + 1 : s.roundCount,
          discussionHistory: [...s.discussionHistory, message],
        })
        return copy
      })
    })

    const addKnowledge = Effect.fn("CollaborationSession.addKnowledge")(function* (sessionID, knowledgeID) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, { ...s, knowledgeExchanged: [...s.knowledgeExchanged, knowledgeID] })
        return copy
      })
    })

    const addReview = Effect.fn("CollaborationSession.addReview")(function* (sessionID, reviewID) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, { ...s, reviewHistory: [...s.reviewHistory, reviewID] })
        return copy
      })
    })

    const setConsensus = Effect.fn("CollaborationSession.setConsensus")(function* (sessionID, state) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, { ...s, consensusState: state })
        return copy
      })
    })

    const addUnresolved = Effect.fn("CollaborationSession.addUnresolved")(function* (sessionID, question) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, { ...s, unresolvedQuestions: [...s.unresolvedQuestions, question] })
        return copy
      })
    })

    const complete = Effect.fn("CollaborationSession.complete")(function* (sessionID) {
      yield* Ref.update(store, (m) => {
        const s = m.get(sessionID)
        if (s === undefined) return m
        const copy = new Map(m)
        copy.set(sessionID, { ...s, completedAt: Date.now() })
        return copy
      })
    })

    const get = Effect.fn("CollaborationSession.get")(function* (sessionID) {
      return yield* Ref.get(store).pipe(Effect.map((m) => m.get(sessionID)))
    })

    return Service.of({ create, addMessage, addKnowledge, addReview, setConsensus, addUnresolved, complete, get })
  }),
)

export { layer }
