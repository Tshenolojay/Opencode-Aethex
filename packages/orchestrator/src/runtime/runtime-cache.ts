export * as RuntimeCache from "./runtime-cache"

import { Context, Effect, Layer, Ref } from "effect"

export type CacheKey =
  | "repository-summary"
  | "architecture-summary"
  | "dependency-analysis"
  | "documentation-analysis"
  | "search-results"
  | "verification-results"
  | `runtime:cache:${string}`
  | `specialist:${string}:${string}`

export interface CacheEntry {
  readonly key: CacheKey
  readonly value: string
  readonly storedAt: number
  readonly invalidated: boolean
}

export interface Interface {
  readonly get: (key: CacheKey) => Effect.Effect<string | undefined>
  readonly put: (key: CacheKey, value: string) => Effect.Effect<void>
  readonly has: (key: CacheKey) => Effect.Effect<boolean>
  readonly invalidate: (key: CacheKey) => Effect.Effect<void>
  readonly invalidateAll: Effect.Effect<void>
  readonly snapshot: Effect.Effect<readonly CacheEntry[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeCache") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Readonly<Record<string, CacheEntry>>>({})

    const get = Effect.fn("RuntimeCache.get")(function* (key: CacheKey) {
      const map = yield* Ref.get(store)
      const entry = map[key]
      if (!entry || entry.invalidated) return undefined
      return entry.value
    })

    const put = Effect.fn("RuntimeCache.put")(function* (key: CacheKey, value: string) {
      yield* Ref.update(store, (m) => ({
        ...m,
        [key]: { key, value, storedAt: Date.now(), invalidated: false },
      }))
    })

    const has = Effect.fn("RuntimeCache.has")(function* (key: CacheKey) {
      const map = yield* Ref.get(store)
      const entry = map[key]
      return entry !== undefined && !entry.invalidated
    })

    const invalidate = Effect.fn("RuntimeCache.invalidate")(function* (key: CacheKey) {
      yield* Ref.update(store, (m) => {
        const entry = m[key]
        if (!entry) return m
        return { ...m, [key]: { ...entry, invalidated: true } }
      })
    })

    const invalidateAll = Ref.set(store, {})

    const snapshot = Effect.gen(function* () {
      const map = yield* Ref.get(store)
      return Object.values(map)
    })

    return Service.of({ get, put, has, invalidate, invalidateAll, snapshot })
  }),
)

export { layer }
