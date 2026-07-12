export * as SpecialistConversation from "./specialist-conversation"

import { Context, Effect, Layer, Ref } from "effect"
import type { ConversationMessage, MessageType } from "./specialist-session"

export interface ConversationThread {
  readonly threadID: string
  readonly participants: readonly string[]
  readonly messages: readonly ConversationMessage[]
  readonly resolved: boolean
  readonly resolution: string | undefined
  readonly createdAt: number
}

export interface Interface {
  readonly startThread: (participants: readonly string[]) => Effect.Effect<string>
  readonly sendMessage: (threadID: string, from: string, to: string, type: MessageType, content: string, confidence?: number) => Effect.Effect<void>
  readonly getThread: (threadID: string) => Effect.Effect<ConversationThread | undefined>
  readonly getMessagesByType: (threadID: string, type: MessageType) => Effect.Effect<readonly ConversationMessage[]>
  readonly resolveThread: (threadID: string, resolution: string) => Effect.Effect<void>
  readonly getActiveThreads: (specialistID: string) => Effect.Effect<readonly ConversationThread[]>
  readonly listThreads: () => Effect.Effect<readonly ConversationThread[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistConversation") {}

let threadCounter = 0
let msgCounter = 0

function nextThreadID(): string {
  threadCounter++
  return `thread-${Date.now()}-${threadCounter}`
}

function nextMsgID(): string {
  msgCounter++
  return `msg-${Date.now()}-${msgCounter}`
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const threads = yield* Ref.make(new Map<string, ConversationThread>())

    const result: Interface = {
      startThread: Effect.fn("SpecialistConversation.startThread")(function* (participants) {
        const id = nextThreadID()
        yield* Ref.update(threads, (map) => {
          map.set(id, {
            threadID: id, participants, messages: [],
            resolved: false, resolution: undefined, createdAt: Date.now(),
          })
          return map
        })
        return id
      }),

      sendMessage: Effect.fn("SpecialistConversation.sendMessage")(function* (threadID, from, to, type, content, confidence) {
        yield* Ref.update(threads, (map) => {
          const thread = map.get(threadID)
          if (thread) {
            map.set(threadID, {
              ...thread,
              messages: [...thread.messages, {
                id: nextMsgID(), from, to, type, content,
                timestamp: Date.now(), confidence,
              }],
            })
          }
          return map
        })
      }),

      getThread: Effect.fn("SpecialistConversation.getThread")(function* (threadID) {
        const map = yield* Ref.get(threads)
        return map.get(threadID)
      }),

      getMessagesByType: Effect.fn("SpecialistConversation.getMessagesByType")(function* (threadID, type) {
        const map = yield* Ref.get(threads)
        const thread = map.get(threadID)
        return thread ? thread.messages.filter((m) => m.type === type) : []
      }),

      resolveThread: Effect.fn("SpecialistConversation.resolveThread")(function* (threadID, resolution) {
        yield* Ref.update(threads, (map) => {
          const thread = map.get(threadID)
          if (thread) {
            map.set(threadID, { ...thread, resolved: true, resolution })
          }
          return map
        })
      }),

      getActiveThreads: Effect.fn("SpecialistConversation.getActiveThreads")(function* (specialistID) {
        const map = yield* Ref.get(threads)
        return [...map.values()].filter((t) => t.participants.includes(specialistID) && !t.resolved)
      }),

      listThreads: Effect.fn("SpecialistConversation.listThreads")(function* () {
        const map = yield* Ref.get(threads)
        return [...map.values()]
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
