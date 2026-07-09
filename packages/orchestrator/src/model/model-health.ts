export * as ModelHealth from "./model-health"

import { Context, Effect, Layer, Ref } from "effect"
import { ModelCatalog } from "./model-catalog"

export interface ModelHealthRecord {
  readonly modelID: string
  readonly providerID: string
  readonly availabilityCount: number
  readonly failureCount: number
  readonly averageLatencyMs: number
  readonly successfulSelections: number
  readonly timeoutCount: number
  readonly lastChecked: number
  readonly healthScore: number
}

export interface Interface {
  readonly recordSelection: (providerID: string, modelID: string, success: boolean) => Effect.Effect<void>
  readonly recordLatency: (providerID: string, modelID: string, latencyMs: number) => Effect.Effect<void>
  readonly recordTimeout: (providerID: string, modelID: string) => Effect.Effect<void>
  readonly getHealth: (providerID: string, modelID: string) => Effect.Effect<ModelHealthRecord | undefined>
  readonly getAllHealth: () => Effect.Effect<readonly ModelHealthRecord[]>
  readonly getUnhealthyModels: (threshold?: number) => Effect.Effect<readonly ModelHealthRecord[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelHealth") {}

type HealthMap = Map<string, ModelHealthRecord>

function key(providerID: string, modelID: string): string {
  return `${providerID}:${modelID}`
}

function computeHealthScore(record: ModelHealthRecord): number {
  const totalAttempts = record.availabilityCount + record.failureCount
  if (totalAttempts === 0) return 1
  const successRate = record.successfulSelections / Math.max(totalAttempts, 1)
  const timeoutPenalty = record.timeoutCount / Math.max(totalAttempts, 1) * 0.3
  const latencyFactor = record.averageLatencyMs > 0 ? Math.min(record.averageLatencyMs / 10000, 1) * 0.2 : 0
  return Math.max(0, Math.min(1, successRate - timeoutPenalty - latencyFactor))
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const healthMap = yield* Ref.make<HealthMap>(new Map())

    const getOrCreate = Effect.fn("ModelHealth.getOrCreate")(function* (providerID: string, modelID: string) {
      const map = yield* Ref.get(healthMap)
      const k = key(providerID, modelID)
      let record = map.get(k)
      if (!record) {
        record = {
          modelID, providerID,
          availabilityCount: 0, failureCount: 0, averageLatencyMs: 0,
          successfulSelections: 0, timeoutCount: 0, lastChecked: Date.now(),
          healthScore: 1,
        }
        map.set(k, record)
      }
      return record
    })

    const recordSelection: Interface["recordSelection"] = Effect.fn("ModelHealth.recordSelection")(function* (providerID, modelID, success) {
      yield* Ref.update(healthMap, (map) => {
        const k = key(providerID, modelID)
        const current = map.get(k) ?? {
          modelID, providerID, availabilityCount: 0, failureCount: 0,
          averageLatencyMs: 0, successfulSelections: 0, timeoutCount: 0,
          lastChecked: Date.now(), healthScore: 1,
        }
        const updated: ModelHealthRecord = {
          ...current,
          availabilityCount: current.availabilityCount + 1,
          failureCount: success ? current.failureCount : current.failureCount + 1,
          successfulSelections: success ? current.successfulSelections + 1 : current.successfulSelections,
          lastChecked: Date.now(),
        }
        map.set(k, { ...updated, healthScore: computeHealthScore(updated) })
        return map
      })
    })

    const recordLatency: Interface["recordLatency"] = Effect.fn("ModelHealth.recordLatency")(function* (providerID, modelID, latencyMs) {
      yield* Ref.update(healthMap, (map) => {
        const k = key(providerID, modelID)
        const current = map.get(k) ?? {
          modelID, providerID, availabilityCount: 0, failureCount: 0,
          averageLatencyMs: 0, successfulSelections: 0, timeoutCount: 0,
          lastChecked: Date.now(), healthScore: 1,
        }
        const totalSamples = current.availabilityCount + 1
        const avgLatency = ((current.averageLatencyMs * current.availabilityCount) + latencyMs) / totalSamples
        const updated: ModelHealthRecord = {
          ...current,
          availabilityCount: totalSamples,
          averageLatencyMs: avgLatency,
          lastChecked: Date.now(),
        }
        map.set(k, { ...updated, healthScore: computeHealthScore(updated) })
        return map
      })
    })

    const recordTimeout: Interface["recordTimeout"] = Effect.fn("ModelHealth.recordTimeout")(function* (providerID, modelID) {
      yield* Ref.update(healthMap, (map) => {
        const k = key(providerID, modelID)
        const current = map.get(k) ?? {
          modelID, providerID, availabilityCount: 0, failureCount: 0,
          averageLatencyMs: 0, successfulSelections: 0, timeoutCount: 0,
          lastChecked: Date.now(), healthScore: 1,
        }
        const updated: ModelHealthRecord = {
          ...current,
          timeoutCount: current.timeoutCount + 1,
          lastChecked: Date.now(),
        }
        map.set(k, { ...updated, healthScore: computeHealthScore(updated) })
        return map
      })
    })

    const getHealth: Interface["getHealth"] = Effect.fn("ModelHealth.getHealth")(function* (providerID, modelID) {
      const map = yield* Ref.get(healthMap)
      return map.get(key(providerID, modelID))
    })

    const getAllHealth: Interface["getAllHealth"] = Effect.fn("ModelHealth.getAllHealth")(function* () {
      const map = yield* Ref.get(healthMap)
      return Array.from(map.values())
    })

    const getUnhealthyModels: Interface["getUnhealthyModels"] = Effect.fn("ModelHealth.getUnhealthyModels")(function* (threshold = 0.5) {
      const map = yield* Ref.get(healthMap)
      return Array.from(map.values()).filter((r) => r.healthScore < threshold)
    })

    return Service.of({ recordSelection, recordLatency, recordTimeout, getHealth, getAllHealth, getUnhealthyModels })
  }),
)

export { layer }
