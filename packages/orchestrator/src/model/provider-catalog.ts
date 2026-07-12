export * as ProviderCatalog from "./provider-catalog"

import { Context, Effect, Layer } from "effect"
import { Catalog } from "../catalog"

type ProviderInfo = Catalog.ProviderData

export interface ProviderMetadata {
  readonly providerID: string
  readonly name: string
  readonly disabled: boolean
  readonly healthScore: number
  readonly availabilityScore: number
  readonly averageLatencyMs: number
  readonly reliabilityScore: number
  readonly averageCostPerToken: number
  readonly modelCount: number
  readonly activeModelCount: number
  readonly rateLimitEstimated: boolean
}

export interface ProviderSnapshot {
  readonly providers: readonly ProviderMetadata[]
  readonly timestamp: number
}

const HEALTH_BY_PROVIDER: Record<string, number> = {
  openai: 0.98, anthropic: 0.97, google: 0.96, mistral: 0.90,
  deepseek: 0.88, openrouter: 0.85,
}

function estimateHealth(provider: ProviderInfo): number {
  return HEALTH_BY_PROVIDER[provider.id] ?? 0.80
}

function estimateAvailability(provider: ProviderInfo): number {
  if (provider.disabled) return 0
  return HEALTH_BY_PROVIDER[provider.id] ? (HEALTH_BY_PROVIDER[provider.id] - 0.05) : 0.75
}

function estimateLatency(provider: ProviderInfo): number {
  const name = provider.name?.toLowerCase() ?? provider.id.toLowerCase()
  if (name.includes("openai") || name.includes("anthropic") || name.includes("google")) return 400
  if (name.includes("mistral") || name.includes("deepseek")) return 600
  return 800
}

export interface Interface {
  readonly getProvider: (providerID: string) => Effect.Effect<ProviderMetadata | undefined>
  readonly allProviders: () => Effect.Effect<readonly ProviderMetadata[]>
  readonly availableProviders: () => Effect.Effect<readonly ProviderMetadata[]>
  readonly refresh: () => Effect.Effect<ProviderSnapshot>
  readonly snapshot: () => Effect.Effect<ProviderSnapshot | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ProviderCatalog") {}

function enrichProvider(
  provider: ProviderInfo,
  modelCount: number,
  activeModelCount: number,
  avgCost: number,
): ProviderMetadata {
  return {
    providerID: provider.id,
    name: provider.name ?? provider.id,
    disabled: provider.disabled ?? false,
    healthScore: estimateHealth(provider),
    availabilityScore: estimateAvailability(provider),
    averageLatencyMs: estimateLatency(provider),
    reliabilityScore: estimateHealth(provider) - 0.05,
    averageCostPerToken: avgCost,
    modelCount,
    activeModelCount,
    rateLimitEstimated: true,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* Catalog.Service

    let snap: ProviderSnapshot | undefined

    const result: Interface = {
      getProvider: Effect.fn("ProviderCatalog.getProvider")(function* (providerID) {
        const provider = yield* catalog.provider.get(providerID)
        if (!provider) return
        const models = yield* catalog.model.all()
        const providerModels = models.filter((m) => m.providerID === provider.id)
        const active = providerModels.filter((m) => m.enabled && m.status === "active")
        const avgCost = providerModels.length > 0
          ? providerModels.reduce((sum, m) => sum + (m.cost[0]?.input ?? 0) + (m.cost[0]?.output ?? 0), 0) / providerModels.length
          : 0
        return enrichProvider(provider, providerModels.length, active.length, avgCost)
      }),

      allProviders: Effect.fn("ProviderCatalog.allProviders")(function* () {
        const providers = yield* catalog.provider.all()
        const models = yield* catalog.model.all()
        return providers.map((provider) => {
          const providerModels = models.filter((m) => m.providerID === provider.id)
          const active = providerModels.filter((m) => m.enabled && m.status === "active")
          const avgCost = providerModels.length > 0
            ? providerModels.reduce((sum, m) => sum + (m.cost[0]?.input ?? 0) + (m.cost[0]?.output ?? 0), 0) / providerModels.length
            : 0
          return enrichProvider(provider, providerModels.length, active.length, avgCost)
        })
      }),

      availableProviders: Effect.fn("ProviderCatalog.availableProviders")(function* () {
        const providers = yield* catalog.provider.available()
        const models = yield* catalog.model.all()
        return providers.map((provider) => {
          const providerModels = models.filter((m) => m.providerID === provider.id)
          const active = providerModels.filter((m) => m.enabled && m.status === "active")
          const avgCost = providerModels.length > 0
            ? providerModels.reduce((sum, m) => sum + (m.cost[0]?.input ?? 0) + (m.cost[0]?.output ?? 0), 0) / providerModels.length
            : 0
          return enrichProvider(provider, providerModels.length, active.length, avgCost)
        })
      }),

      refresh: Effect.fn("ProviderCatalog.refresh")(function* () {
        const providers = yield* result.allProviders()
        snap = { providers, timestamp: Date.now() }
        return snap
      }),

      snapshot: Effect.fn("ProviderCatalog.snapshot")(function* () {
        return snap
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
