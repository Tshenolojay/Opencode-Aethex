export * as ProviderHealth from "./provider-health"

import { Context, Effect, Layer, Ref } from "effect"
import { ProviderCatalog } from "./provider-catalog"

export interface ProviderHealthRecord {
  readonly providerID: string
  readonly availabilityScore: number
  readonly totalFailures: number
  readonly totalRequests: number
  readonly averageLatencyMs: number
  readonly rateLimitHits: number
  readonly lastChecked: number
  readonly overallHealth: number
}

export interface Interface {
  readonly recordRequest: (providerID: string, success: boolean) => Effect.Effect<void>
  readonly recordLatency: (providerID: string, latencyMs: number) => Effect.Effect<void>
  readonly recordRateLimit: (providerID: string) => Effect.Effect<void>
  readonly getHealth: (providerID: string) => Effect.Effect<ProviderHealthRecord | undefined>
  readonly getAllHealth: () => Effect.Effect<readonly ProviderHealthRecord[]>
  readonly getUnhealthyProviders: (threshold?: number) => Effect.Effect<readonly ProviderHealthRecord[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ProviderHealth") {}

type ProviderHealthMap = Map<string, ProviderHealthRecord>

function computeOverallHealth(record: ProviderHealthRecord): number {
  const total = record.totalRequests + record.totalFailures
  if (total === 0) return 1
  const successRate = record.totalRequests / Math.max(total, 1)
  const rateLimitPenalty = record.rateLimitHits / Math.max(total, 1) * 0.5
  const latencyFactor = record.averageLatencyMs > 0 ? Math.min(record.averageLatencyMs / 10000, 1) * 0.2 : 0
  return Math.max(0, Math.min(1, successRate - rateLimitPenalty - latencyFactor))
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const healthMap = yield* Ref.make<ProviderHealthMap>(new Map())

    const getOrCreate = (providerID: string, map: ProviderHealthMap): ProviderHealthRecord => {
      let record = map.get(providerID)
      if (!record) {
        record = {
          providerID, availabilityScore: 1, totalFailures: 0, totalRequests: 0,
          averageLatencyMs: 0, rateLimitHits: 0, lastChecked: Date.now(), overallHealth: 1,
        }
        map.set(providerID, record)
      }
      return record
    }

    const recordRequest: Interface["recordRequest"] = Effect.fn("ProviderHealth.recordRequest")(function* (providerID, success) {
      yield* Ref.update(healthMap, (map) => {
        const current = getOrCreate(providerID, map)
        const updated: ProviderHealthRecord = {
          ...current,
          totalRequests: current.totalRequests + (success ? 1 : 0),
          totalFailures: current.totalFailures + (success ? 0 : 1),
          lastChecked: Date.now(),
        }
        map.set(providerID, { ...updated, overallHealth: computeOverallHealth(updated) })
        return map
      })
    })

    const recordLatency: Interface["recordLatency"] = Effect.fn("ProviderHealth.recordLatency")(function* (providerID, latencyMs) {
      yield* Ref.update(healthMap, (map) => {
        const current = getOrCreate(providerID, map)
        const totalSamples = current.totalRequests + 1
        const avgLatency = ((current.averageLatencyMs * current.totalRequests) + latencyMs) / totalSamples
        const updated: ProviderHealthRecord = {
          ...current,
          totalRequests: totalSamples,
          averageLatencyMs: avgLatency,
          lastChecked: Date.now(),
        }
        map.set(providerID, { ...updated, overallHealth: computeOverallHealth(updated) })
        return map
      })
    })

    const recordRateLimit: Interface["recordRateLimit"] = Effect.fn("ProviderHealth.recordRateLimit")(function* (providerID) {
      yield* Ref.update(healthMap, (map) => {
        const current = getOrCreate(providerID, map)
        const updated: ProviderHealthRecord = {
          ...current,
          rateLimitHits: current.rateLimitHits + 1,
          lastChecked: Date.now(),
        }
        map.set(providerID, { ...updated, overallHealth: computeOverallHealth(updated) })
        return map
      })
    })

    const getHealth: Interface["getHealth"] = Effect.fn("ProviderHealth.getHealth")(function* (providerID) {
      const map = yield* Ref.get(healthMap)
      return map.get(providerID)
    })

    const getAllHealth: Interface["getAllHealth"] = Effect.fn("ProviderHealth.getAllHealth")(function* () {
      const map = yield* Ref.get(healthMap)
      return Array.from(map.values())
    })

    const getUnhealthyProviders: Interface["getUnhealthyProviders"] = Effect.fn("ProviderHealth.getUnhealthyProviders")(function* (threshold = 0.5) {
      const map = yield* Ref.get(healthMap)
      return Array.from(map.values()).filter((r) => r.overallHealth < threshold)
    })

    return Service.of({ recordRequest, recordLatency, recordRateLimit, getHealth, getAllHealth, getUnhealthyProviders })
  }),
)

export { layer }
