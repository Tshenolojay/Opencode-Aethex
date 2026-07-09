export * as ProviderAdapter from "./provider-adapter"

import { Context, Effect, Layer } from "effect"
import { ProviderCatalog, type ProviderMetadata } from "./provider-catalog"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability } from "../types/capability"

export interface ProviderCapabilityProfile {
  readonly providerID: string
  readonly supportedCapabilities: readonly Capability[]
  readonly modelCount: number
  readonly averageQuality: number
  readonly averageCost: number
  readonly primarySpecialization: string | undefined
}

export interface ProviderAdapterResult {
  readonly profile: ProviderCapabilityProfile
  readonly models: readonly ModelMetadata[]
  readonly compatibleRequirements: readonly Capability[]
}

export interface Interface {
  readonly getProviderProfile: (providerID: string) => Effect.Effect<ProviderAdapterResult | undefined>
  readonly getAllProviderProfiles: () => Effect.Effect<readonly ProviderAdapterResult[]>
  readonly findProvidersByCapability: (capability: Capability) => Effect.Effect<readonly ProviderAdapterResult[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ProviderAdapter") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const providerCatalog = yield* ProviderCatalog.Service
    const modelCatalog = yield* ModelCatalog.Service

    const buildProfile = Effect.fn("ProviderAdapter.buildProfile")(function* (provider: ProviderMetadata) {
      const models = yield* modelCatalog.getModelsByProvider(provider.providerID)
      const allCaps = new Set<Capability>()
      for (const m of models) {
        for (const c of m.capabilities) allCaps.add(c)
      }
      const supportedCapabilities = Array.from(allCaps)
      const avgQuality = models.length > 0 ? models.reduce((s, m) => s + m.qualityScore, 0) / models.length : 0
      const avgCost = models.length > 0 ? models.reduce((s, m) => s + m.costPerInputToken + m.costPerOutputToken, 0) / models.length : 0

      const capCounts = new Map<string, number>()
      for (const m of models) {
        for (const c of m.capabilities) {
          capCounts.set(c, (capCounts.get(c) ?? 0) + 1)
        }
      }
      const primarySpecialization = Array.from(capCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([c]) => c)
        .find(() => true)

      return {
        providerID: provider.providerID,
        supportedCapabilities,
        modelCount: models.length,
        averageQuality: avgQuality,
        averageCost: avgCost,
        primarySpecialization,
      }
    })

    const getProviderProfile: Interface["getProviderProfile"] = Effect.fn("ProviderAdapter.getProviderProfile")(function* (providerID) {
      const provider = yield* providerCatalog.getProvider(providerID)
      if (!provider) return undefined
      const profile = yield* buildProfile(provider)
      const models = yield* modelCatalog.getModelsByProvider(providerID)
      return { profile, models, compatibleRequirements: profile.supportedCapabilities }
    })

    const getAllProviderProfiles: Interface["getAllProviderProfiles"] = Effect.fn("ProviderAdapter.getAllProviderProfiles")(function* () {
      const providers = yield* providerCatalog.allProviders()
      const results: ProviderAdapterResult[] = []
      for (const p of providers) {
        const profile = yield* buildProfile(p)
        const models = yield* modelCatalog.getModelsByProvider(p.providerID)
        results.push({ profile, models, compatibleRequirements: profile.supportedCapabilities })
      }
      return results
    })

    const findProvidersByCapability: Interface["findProvidersByCapability"] = Effect.fn("ProviderAdapter.findProvidersByCapability")(function* (capability) {
      const all = yield* getAllProviderProfiles()
      return all.filter((p) => p.profile.supportedCapabilities.includes(capability))
    })

    return Service.of({ getProviderProfile, getAllProviderProfiles, findProvidersByCapability })
  }),
)

export { layer }
