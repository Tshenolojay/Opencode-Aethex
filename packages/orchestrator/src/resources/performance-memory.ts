export * as PerformanceMemory from "./performance-memory"

import { Context, Effect, Layer, Ref } from "effect"
import type { Capability } from "../types/capability"

export interface ProviderModelPerformance {
  readonly providerID: string
  readonly modelID: string
  readonly successCount: number
  readonly failureCount: number
  readonly totalLatencyMs: number
  readonly averageLatencyMs: number
  readonly lastUsed: number
}

export interface CapabilityPerformance {
  readonly capability: Capability
  readonly providerID: string
  readonly modelID: string
  readonly averageScore: number
  readonly sampleCount: number
  readonly averageLatencyMs: number
}

export interface PerformanceSnapshot {
  readonly providerModel: ReadonlyMap<string, ProviderModelPerformance>
  readonly capability: ReadonlyMap<string, CapabilityPerformance>
  readonly timestamp: number
}

export interface Interface {
  readonly recordProviderModelUse: (
    providerID: string,
    modelID: string,
    latencyMs: number,
    success: boolean,
  ) => Effect.Effect<void>
  readonly recordCapabilityUse: (
    capability: Capability,
    providerID: string,
    modelID: string,
    score: number,
    latencyMs: number,
  ) => Effect.Effect<void>
  readonly getProviderModelStats: (providerID: string, modelID: string) => Effect.Effect<ProviderModelPerformance | undefined>
  readonly getCapabilityStats: (capability: Capability) => Effect.Effect<readonly CapabilityPerformance[]>
  readonly getBestForCapability: (capability: Capability) => Effect.Effect<CapabilityPerformance | undefined>
  readonly snapshot: () => Effect.Effect<PerformanceSnapshot>
  readonly reset: () => Effect.Effect<void>
}

function pmKey(providerID: string, modelID: string): string {
  return `${providerID}/${modelID}`
}

function capKey(capability: Capability, providerID: string, modelID: string): string {
  return `${capability}/${providerID}/${modelID}`
}

const make = Effect.gen(function* () {
  const pmRef = yield* Ref.make<ReadonlyMap<string, ProviderModelPerformance>>(new Map())
  const capRef = yield* Ref.make<ReadonlyMap<string, CapabilityPerformance>>(new Map())

  const recordProviderModelUse = (providerID: string, modelID: string, latencyMs: number, success: boolean) =>
    Ref.update(pmRef, (prev) => {
      const key = pmKey(providerID, modelID)
      const existing = prev.get(key)
      const successCount = (existing?.successCount ?? 0) + (success ? 1 : 0)
      const failureCount = (existing?.failureCount ?? 0) + (success ? 0 : 1)
      const totalLatency = (existing?.totalLatencyMs ?? 0) + latencyMs
      const total = successCount + failureCount
      const updated: ProviderModelPerformance = {
        providerID,
        modelID,
        successCount,
        failureCount,
        totalLatencyMs: totalLatency,
        averageLatencyMs: total > 0 ? totalLatency / total : latencyMs,
        lastUsed: Date.now(),
      }
      const next = new Map(prev)
      next.set(key, updated)
      return next
    })

  const recordCapabilityUse = (
    capability: Capability,
    providerID: string,
    modelID: string,
    score: number,
    latencyMs: number,
  ) =>
    Ref.update(capRef, (prev) => {
      const key = capKey(capability, providerID, modelID)
      const existing = prev.get(key)
      const sampleCount = (existing?.sampleCount ?? 0) + 1
      const prevAvgScore = existing?.averageScore ?? 0
      const prevAvgLatency = existing?.averageLatencyMs ?? 0
      const updated: CapabilityPerformance = {
        capability,
        providerID,
        modelID,
        averageScore: prevAvgScore + (score - prevAvgScore) / sampleCount,
        sampleCount,
        averageLatencyMs: prevAvgLatency + (latencyMs - prevAvgLatency) / sampleCount,
      }
      const next = new Map(prev)
      next.set(key, updated)
      return next
    })

  const getProviderModelStats = (providerID: string, modelID: string) =>
    Effect.map(Ref.get(pmRef), (s) => s.get(pmKey(providerID, modelID)))

  const getCapabilityStats = (capability: Capability) =>
    Effect.map(Ref.get(capRef), (all) => {
      const results: CapabilityPerformance[] = []
      for (const [key, perf] of all) {
        if (key.startsWith(`${capability}/`)) results.push(perf)
      }
      return results.sort((a, b) => b.averageScore - a.averageScore)
    })

  const getBestForCapability = (capability: Capability) =>
    Effect.map(Ref.get(capRef), (all) => {
      let best: CapabilityPerformance | undefined
      for (const [key, perf] of all) {
        if (key.startsWith(`${capability}/`)) {
          if (!best || perf.averageScore > best.averageScore) best = perf
        }
      }
      return best
    })

  const snapshot = () => Effect.map(Effect.all([Ref.get(pmRef), Ref.get(capRef)]), ([pm, cap]) => ({
    providerModel: pm,
    capability: cap,
    timestamp: Date.now(),
  }))

  const reset = () => Effect.andThen(Ref.set(pmRef, new Map()), Ref.set(capRef, new Map()))

  return Service.of({
    recordProviderModelUse,
    recordCapabilityUse,
    getProviderModelStats,
    getCapabilityStats,
    getBestForCapability,
    snapshot,
    reset,
  })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PerformanceMemory") {}

const layer = Layer.effect(Service, make)
export { layer }
