export * as ProviderHealth from "./provider-health"

import { Context, Effect, Layer, Ref } from "effect"

export interface ProviderHealthState {
  readonly providerID: string
  readonly available: boolean
  readonly healthScore: number
  readonly failureCount: number
  readonly successCount: number
  readonly averageLatencyMs: number
  readonly rateLimitRemaining: number | undefined
  readonly quotaRemaining: number | undefined
  readonly freeTierRemaining: number | undefined
  readonly lastFailureTime: number | undefined
  readonly lastSuccessTime: number | undefined
  readonly lastUpdated: number
  readonly errorRate: number
  readonly timeoutCount: number
  readonly consecutiveFailures: number
}

export interface ProviderHealthSnapshot {
  readonly providers: ReadonlyMap<string, ProviderHealthState>
  readonly timestamp: number
}

export interface Interface {
  readonly recordSuccess: (providerID: string, latencyMs: number) => Effect.Effect<void>
  readonly recordFailure: (providerID: string, error?: string) => Effect.Effect<void>
  readonly recordTimeout: (providerID: string) => Effect.Effect<void>
  readonly getState: (providerID: string) => Effect.Effect<ProviderHealthState | undefined>
  readonly getHealthScore: (providerID: string) => Effect.Effect<number>
  readonly updateRateLimit: (providerID: string, remaining: number) => Effect.Effect<void>
  readonly updateQuota: (providerID: string, remaining: number) => Effect.Effect<void>
  readonly updateFreeTier: (providerID: string, remaining: number) => Effect.Effect<void>
  readonly snapshot: () => Effect.Effect<ProviderHealthSnapshot>
  readonly reset: (providerID?: string) => Effect.Effect<void>
}

function initState(providerID: string): ProviderHealthState {
  return {
    providerID,
    available: true,
    healthScore: 1.0,
    failureCount: 0,
    successCount: 0,
    averageLatencyMs: 0,
    rateLimitRemaining: undefined,
    quotaRemaining: undefined,
    freeTierRemaining: undefined,
    lastFailureTime: undefined,
    lastSuccessTime: undefined,
    lastUpdated: Date.now(),
    errorRate: 0,
    timeoutCount: 0,
    consecutiveFailures: 0,
  }
}

function computeHealthScore(state: ProviderHealthState): number {
  const total = state.successCount + state.failureCount
  if (total === 0) return 1.0
  const successRate = state.successCount / total
  const penalty = Math.min(state.consecutiveFailures * 0.1, 0.5)
  return Math.max(0, Math.min(1, successRate - penalty))
}

const make = Effect.gen(function* () {
  const stateRef = yield* Ref.make<ReadonlyMap<string, ProviderHealthState>>(new Map())

  const getState = (providerID: string) =>
    Effect.map(Ref.get(stateRef), (s) => s.get(providerID))

  const getHealthScore = (providerID: string) =>
    Effect.map(Ref.get(stateRef), (s) => s.get(providerID)?.healthScore ?? 1.0)

  const recordSuccess = (providerID: string, latencyMs: number) =>
    Ref.update(stateRef, (prev) => {
      const existing = prev.get(providerID) ?? initState(providerID)
      const newCount = existing.successCount + 1
      const newAvg =
        existing.averageLatencyMs === 0
          ? latencyMs
          : (existing.averageLatencyMs * existing.successCount + latencyMs) / newCount
      const updated: ProviderHealthState = {
        ...existing,
        available: true,
        successCount: newCount,
        averageLatencyMs: newAvg,
        lastSuccessTime: Date.now(),
        lastUpdated: Date.now(),
        consecutiveFailures: 0,
      }
      const next = new Map(prev)
      next.set(providerID, { ...updated, healthScore: computeHealthScore(updated) })
      return next
    })

  const recordFailure = (providerID: string) =>
    Ref.update(stateRef, (prev) => {
      const existing = prev.get(providerID) ?? initState(providerID)
      const updated: ProviderHealthState = {
        ...existing,
        failureCount: existing.failureCount + 1,
        consecutiveFailures: existing.consecutiveFailures + 1,
        lastFailureTime: Date.now(),
        lastUpdated: Date.now(),
        available: existing.consecutiveFailures < 3,
      }
      const next = new Map(prev)
      next.set(providerID, { ...updated, healthScore: computeHealthScore(updated) })
      return next
    })

  const recordTimeout = (providerID: string) =>
    Effect.andThen(recordFailure(providerID), () =>
      Ref.update(stateRef, (prev) => {
        const existing = prev.get(providerID) ?? initState(providerID)
        const next = new Map(prev)
        next.set(providerID, { ...existing, timeoutCount: existing.timeoutCount + 1 })
        return next
      }))

  const updateRateLimit = (providerID: string, remaining: number) =>
    Ref.update(stateRef, (prev) => {
      const next = new Map(prev)
      const existing = prev.get(providerID) ?? initState(providerID)
      next.set(providerID, { ...existing, rateLimitRemaining: remaining, lastUpdated: Date.now() })
      return next
    })

  const updateQuota = (providerID: string, remaining: number) =>
    Ref.update(stateRef, (prev) => {
      const next = new Map(prev)
      const existing = prev.get(providerID) ?? initState(providerID)
      next.set(providerID, {
        ...existing,
        quotaRemaining: remaining,
        available: remaining > 0,
        lastUpdated: Date.now(),
      })
      return next
    })

  const updateFreeTier = (providerID: string, remaining: number) =>
    Ref.update(stateRef, (prev) => {
      const next = new Map(prev)
      const existing = prev.get(providerID) ?? initState(providerID)
      next.set(providerID, { ...existing, freeTierRemaining: remaining, lastUpdated: Date.now() })
      return next
    })

  const snapshot = () => Effect.map(Ref.get(stateRef), (providers) => ({
    providers,
    timestamp: Date.now(),
  }))

  const reset = (providerID?: string) =>
    providerID
      ? Ref.update(stateRef, (prev) => {
          const next = new Map(prev)
          next.delete(providerID)
          return next
        })
      : Ref.set(stateRef, new Map())

  return Service.of({
    recordSuccess,
    recordFailure,
    recordTimeout,
    getState,
    getHealthScore,
    updateRateLimit,
    updateQuota,
    updateFreeTier,
    snapshot,
    reset,
  })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ResourceProviderHealth") {}

const layer = Layer.effect(Service, make)
export { layer }
