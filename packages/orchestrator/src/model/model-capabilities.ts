export * as ModelCapabilities from "./model-capabilities"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability } from "../types/capability"

export interface CapabilityCoverage {
  readonly capability: Capability
  readonly modelCount: number
  readonly averageScore: number
  readonly topModel: string
  readonly topProvider: string
}

export interface CapabilityHeatmap {
  readonly coverages: readonly CapabilityCoverage[]
  readonly totalCapabilities: number
  readonly totalModels: number
  readonly timestamp: number
}

export interface Interface {
  readonly getHeatmap: () => Effect.Effect<CapabilityHeatmap>
  readonly getCoverage: (capability: Capability) => Effect.Effect<CapabilityCoverage | undefined>
  readonly getModelsWithAllCapabilities: (capabilities: readonly Capability[]) => Effect.Effect<readonly ModelMetadata[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelCapabilities") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* ModelCatalog.Service

    const getHeatmap: Interface["getHeatmap"] = Effect.fn("ModelCapabilities.getHeatmap")(function* () {
      const models = yield* catalog.availableModels()
      const capMap = new Map<Capability, { count: number; totalScore: number; topModel: string; topProvider: string; topScore: number }>()

      for (const m of models) {
        for (const c of m.capabilities) {
          const entry = capMap.get(c) ?? { count: 0, totalScore: 0, topModel: "", topProvider: "", topScore: 0 }
          entry.count++
          entry.totalScore += m.qualityScore
          if (m.qualityScore > entry.topScore) {
            entry.topScore = m.qualityScore
            entry.topModel = m.modelID
            entry.topProvider = m.providerID
          }
          capMap.set(c, entry)
        }
      }

      const coverages: CapabilityCoverage[] = Array.from(capMap.entries()).map(([capability, data]) => ({
        capability,
        modelCount: data.count,
        averageScore: data.count > 0 ? data.totalScore / data.count : 0,
        topModel: data.topModel,
        topProvider: data.topProvider,
      }))

      return {
        coverages,
        totalCapabilities: coverages.length,
        totalModels: models.length,
        timestamp: Date.now(),
      }
    })

    const getCoverage: Interface["getCoverage"] = Effect.fn("ModelCapabilities.getCoverage")(function* (capability) {
      const heatmap = yield* getHeatmap()
      return heatmap.coverages.find((c) => c.capability === capability)
    })

    const getModelsWithAllCapabilities: Interface["getModelsWithAllCapabilities"] = Effect.fn("ModelCapabilities.getModelsWithAllCapabilities")(function* (capabilities) {
      const models = yield* catalog.availableModels()
      return models.filter((m) => capabilities.every((c) => m.capabilities.includes(c)))
    })

    return Service.of({ getHeatmap, getCoverage, getModelsWithAllCapabilities })
  }),
)

export { layer }
