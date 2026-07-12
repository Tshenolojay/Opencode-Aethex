export * as SpecialistSession from "./specialist-session"

import { Context, Effect, Layer, Ref } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { ModelCandidate } from "../execution/specialist-result"

export type SessionLifecycleState = "created" | "preparing" | "assigned" | "executing" | "completed" | "failed" | "recovered"

export interface SessionMetrics {
  readonly executionTimeMs: number
  readonly tokenEstimate: number
  readonly costEstimate: number
  readonly retries: number
  readonly knowledgeProduced: number
  readonly knowledgeConsumed: number
}

export interface SpecialistSessionData {
  readonly sessionID: string
  readonly specialistID: string
  readonly specialistName: string
  readonly assignedModel: ModelCandidate | undefined
  readonly fallbackModel: ModelCandidate | undefined
  readonly capabilities: readonly string[]
  readonly executionBudget: {
    readonly maxTokens: number
    readonly maxTimeMs: number
    readonly maxCost: number
    readonly maxRetries: number
  }
  readonly priority: number
  readonly status: SessionLifecycleState
  readonly conversationHistory: readonly ConversationMessage[]
  readonly knowledgeProduced: readonly KnowledgeClaim[]
  readonly knowledgeConsumed: readonly string[]
  readonly metrics: SessionMetrics
  readonly lifecycle: {
    readonly createdAt: number
    readonly assignedAt: number | undefined
    readonly startedAt: number | undefined
    readonly completedAt: number | undefined
  }
}

export interface ConversationMessage {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly type: MessageType
  readonly content: string
  readonly timestamp: number
  readonly confidence: number | undefined
}

export type MessageType =
  | "question" | "answer" | "clarification" | "review" | "approval"
  | "rejection" | "suggestion" | "evidence" | "warning" | "risk"
  | "recommendation" | "decision"

export interface KnowledgeClaim {
  readonly id: string
  readonly type: string
  readonly content: string
  readonly source: string
  readonly confidence: number
  readonly timestamp: number
  readonly owner: string
  readonly provenance: readonly string[]
  readonly dependencies: readonly string[]
}

export interface Interface {
  readonly create: (specialist: SpecialistProfile, priority: number) => Effect.Effect<string>
  readonly get: (sessionID: string) => Effect.Effect<SpecialistSessionData | undefined>
  readonly updateStatus: (sessionID: string, status: SessionLifecycleState) => Effect.Effect<void>
  readonly assignModel: (sessionID: string, model: ModelCandidate, fallback?: ModelCandidate) => Effect.Effect<void>
  readonly addMessage: (sessionID: string, message: ConversationMessage) => Effect.Effect<void>
  readonly addKnowledge: (sessionID: string, claim: KnowledgeClaim) => Effect.Effect<void>
  readonly consumeKnowledge: (sessionID: string, knowledgeID: string) => Effect.Effect<void>
  readonly updateMetrics: (sessionID: string, update: Partial<SessionMetrics>) => Effect.Effect<void>
  readonly listByStatus: (status: SessionLifecycleState) => Effect.Effect<readonly SpecialistSessionData[]>
  readonly all: () => Effect.Effect<readonly SpecialistSessionData[]>
  readonly remove: (sessionID: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistSession") {}

let counter = 0

function nextID(): string {
  counter++
  return `ss-${Date.now()}-${counter}`
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const sessions = yield* Ref.make(new Map<string, SpecialistSessionData>())

    const result: Interface = {
      create: Effect.fn("SpecialistSession.create")(function* (specialist, priority) {
        const id = nextID()
        const now = Date.now()
        const data: SpecialistSessionData = {
          sessionID: id,
          specialistID: specialist.id,
          specialistName: specialist.name,
          assignedModel: undefined,
          fallbackModel: undefined,
          capabilities: [...specialist.requiredCapabilities],
          executionBudget: {
            maxTokens: 32000,
            maxTimeMs: 30000,
            maxCost: 0.50,
            maxRetries: 3,
          },
          priority,
          status: "created",
          conversationHistory: [],
          knowledgeProduced: [],
          knowledgeConsumed: [],
          metrics: {
            executionTimeMs: 0, tokenEstimate: 0, costEstimate: 0,
            retries: 0, knowledgeProduced: 0, knowledgeConsumed: 0,
          },
          lifecycle: {
            createdAt: now, assignedAt: undefined,
            startedAt: undefined, completedAt: undefined,
          },
        }
        yield* Ref.update(sessions, (map) => { map.set(id, data); return map })
        return id
      }),

      get: Effect.fn("SpecialistSession.get")(function* (sessionID) {
        const map = yield* Ref.get(sessions)
        return map.get(sessionID)
      }),

      updateStatus: Effect.fn("SpecialistSession.updateStatus")(function* (sessionID, status) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) {
            const now = Date.now()
            let updated: SpecialistSessionData = { ...s, status }
            if (status === "executing" && !s.lifecycle.startedAt) {
              updated = { ...updated, lifecycle: { ...updated.lifecycle, startedAt: now } }
            }
            if (status === "completed" || status === "failed") {
              updated = { ...updated, lifecycle: { ...updated.lifecycle, completedAt: now } }
            }
            map.set(sessionID, updated)
          }
          return map
        })
      }),

      assignModel: Effect.fn("SpecialistSession.assignModel")(function* (sessionID, model, fallback) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) {
            map.set(sessionID, {
              ...s,
              assignedModel: model,
              fallbackModel: fallback,
              status: "assigned",
              lifecycle: { ...s.lifecycle, assignedAt: Date.now() },
            })
          }
          return map
        })
      }),

      addMessage: Effect.fn("SpecialistSession.addMessage")(function* (sessionID, message) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) map.set(sessionID, { ...s, conversationHistory: [...s.conversationHistory, message] })
          return map
        })
      }),

      addKnowledge: Effect.fn("SpecialistSession.addKnowledge")(function* (sessionID, claim) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) {
            const knowledgeProduced = [...s.knowledgeProduced, claim]
            map.set(sessionID, {
              ...s,
              knowledgeProduced,
              metrics: { ...s.metrics, knowledgeProduced: knowledgeProduced.length },
            })
          }
          return map
        })
      }),

      consumeKnowledge: Effect.fn("SpecialistSession.consumeKnowledge")(function* (sessionID, knowledgeID) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) {
            const knowledgeConsumed = [...s.knowledgeConsumed, knowledgeID]
            map.set(sessionID, {
              ...s,
              knowledgeConsumed,
              metrics: { ...s.metrics, knowledgeConsumed: knowledgeConsumed.length },
            })
          }
          return map
        })
      }),

      updateMetrics: Effect.fn("SpecialistSession.updateMetrics")(function* (sessionID, update) {
        yield* Ref.update(sessions, (map) => {
          const s = map.get(sessionID)
          if (s) map.set(sessionID, { ...s, metrics: { ...s.metrics, ...update } })
          return map
        })
      }),

      listByStatus: Effect.fn("SpecialistSession.listByStatus")(function* (status) {
        const map = yield* Ref.get(sessions)
        return [...map.values()].filter((s) => s.status === status)
      }),

      all: Effect.fn("SpecialistSession.all")(function* () {
        const map = yield* Ref.get(sessions)
        return [...map.values()]
      }),

      remove: Effect.fn("SpecialistSession.remove")(function* (sessionID) {
        yield* Ref.update(sessions, (map) => { map.delete(sessionID); return map })
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
