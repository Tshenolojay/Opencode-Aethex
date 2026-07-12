export * as ModelCatalog from "./model-catalog"

import { Context, Effect, Layer } from "effect"
import { Catalog } from "../catalog"

type ModelInfo = Catalog.ModelData
type ProviderInfo = Catalog.ProviderData
import type { Capability } from "../types/capability"

export interface ModelMetadata {
  readonly providerID: string
  readonly modelID: string
  readonly displayName: string
  readonly contextLimit: number
  readonly maxOutput: number
  readonly costPerInputToken: number
  readonly costPerOutputToken: number
  readonly estimatedLatencyMs: number
  readonly status: string
  readonly enabled: boolean
  readonly capabilities: Capability[]
  readonly supportsTools: boolean
  readonly supportsStreaming: boolean
  readonly supportsVision: boolean
  readonly qualityScore: number
  readonly reliabilityScore: number
}

export interface CatalogSnapshot {
  readonly models: readonly ModelMetadata[]
  readonly timestamp: number
}

type CapabilityHintMap = Partial<Record<Capability, { readonly modelRegex: string; readonly weight: number }>>

const DEFAULT_HINTS: CapabilityHintMap = {
  "reasoning": { modelRegex: "reasoner|opus|sonnet|pro|ultra|deep|think", weight: 0.9 },
  "long-context": { modelRegex: "100k|200k|1m|2m|large|pro|max", weight: 0.8 },
  "fast-response": { modelRegex: "flash|haiku|mini|nano|turbo|lite|small|fast", weight: 0.8 },
  "cheap": { modelRegex: "flash|haiku|mini|nano|lite|small", weight: 0.7 },
  "code-generation": { modelRegex: "code|coder|codestral|deep|reasoner", weight: 0.9 },
  "search": { modelRegex: "search|retrieval", weight: 0.7 },
}

function inferCapabilities(model: ModelInfo, provider: ProviderInfo): Capability[] {
  const caps: Capability[] = []
  const idName = `${model.id} ${model.family ?? ""} ${model.name ?? ""}`.toLowerCase()

  if (model.capabilities.tools) caps.push("tool-use")
  if (model.status === "active" || model.status === "beta") caps.push("fast-response")
  if (model.limit.context >= 64000) caps.push("long-context")
  if (model.limit.output >= 8000) caps.push("large-output")
  if (model.capabilities.output.includes("json")) caps.push("code-generation")
  if (model.capabilities.input.includes("image")) caps.push("analysis")

  for (const [capability, hint] of Object.entries(DEFAULT_HINTS) as [Capability, { modelRegex: string; weight: number }][]) {
    if (new RegExp(hint.modelRegex, "i").test(idName) && !caps.includes(capability)) {
      caps.push(capability)
    }
  }

  return caps
}

function estimateLatency(model: ModelInfo): number {
  const baseCost = model.cost[0] ? model.cost[0].input + model.cost[0].output : 0.01
  if (baseCost <= 0) return 500
  const idName = `${model.id} ${model.family ?? ""} ${model.name ?? ""}`.toLowerCase()
  if (/flash|haiku|mini|nano|fast|lite/.test(idName)) return 300 + baseCost * 1000
  if (/turbo|small|medium/.test(idName)) return 600 + baseCost * 800
  return 1000 + baseCost * 500
}

function estimateQuality(model: ModelInfo): number {
  const idName = `${model.id} ${model.family ?? ""} ${model.name ?? ""}`.toLowerCase()
  if (/opus|ultra|pro|max|reasoner|large/.test(idName)) return 0.95
  if (/sonnet|turbo|medium|flash/.test(idName)) return 0.85
  if (/haiku|mini|nano|lite|small|fast/.test(idName)) return 0.75
  return 0.80
}

function estimateReliability(model: ModelInfo): number {
  if (model.status === "active") return 0.95
  if (model.status === "beta") return 0.80
  if (model.status === "alpha") return 0.60
  return 0.50
}

export interface Interface {
  readonly getModel: (providerID: string, modelID: string) => Effect.Effect<ModelMetadata | undefined>
  readonly allModels: () => Effect.Effect<readonly ModelMetadata[]>
  readonly availableModels: () => Effect.Effect<readonly ModelMetadata[]>
  readonly getModelsByProvider: (providerID: string) => Effect.Effect<readonly ModelMetadata[]>
  readonly refresh: () => Effect.Effect<CatalogSnapshot>
  readonly snapshot: () => Effect.Effect<CatalogSnapshot | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelCatalog") {}

function enrichModel(model: ModelInfo, provider: ProviderInfo): ModelMetadata {
  const capabilities = inferCapabilities(model, provider)
  const cost = model.cost[0]
  return {
    providerID: provider.id,
    modelID: model.id,
    displayName: model.name ?? model.id,
    contextLimit: model.limit.context,
    maxOutput: model.limit.output,
    costPerInputToken: cost?.input ?? 0,
    costPerOutputToken: cost?.output ?? 0,
    estimatedLatencyMs: estimateLatency(model),
    status: model.status,
    enabled: model.enabled,
    capabilities,
    supportsTools: model.capabilities.tools,
    supportsStreaming: model.capabilities.output.includes("stream"),
    supportsVision: model.capabilities.input.includes("image") || model.capabilities.input.includes("video"),
    qualityScore: estimateQuality(model),
    reliabilityScore: estimateReliability(model),
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* Catalog.Service

    let snap: CatalogSnapshot | undefined

    const fetchAllModels = Effect.fn("ModelCatalog.fetchAll")(function* () {
      const providers = yield* catalog.provider.all()
      const all: ModelMetadata[] = []
      for (const provider of providers) {
        const models = yield* catalog.model.all()
        for (const model of models) {
          if (model.providerID === provider.id) {
            all.push(enrichModel(model, provider))
          }
        }
      }
      return all
    })

    const result: Interface = {
      getModel: Effect.fn("ModelCatalog.getModel")(function* (providerID, modelID) {
        const model = yield* catalog.model.get(providerID, modelID)
        if (!model) return
        const provider = yield* catalog.provider.get(providerID)
        if (!provider) return
        return enrichModel(model, provider)
      }),

      allModels: Effect.fn("ModelCatalog.allModels")(function* () {
        const models = yield* catalog.model.all()
        const providers = yield* catalog.provider.all()
        const providerMap = new Map(providers.map((p) => [p.id, p]))
        return models.map((m) => enrichModel(m, providerMap.get(m.providerID) ?? providers[0]))
      }),

      availableModels: Effect.fn("ModelCatalog.availableModels")(function* () {
        const models = yield* catalog.model.available()
        const providers = yield* catalog.provider.available()
        const providerMap = new Map(providers.map((p) => [p.id, p]))
        return models.filter((m) => providerMap.has(m.providerID)).map((m) => enrichModel(m, providerMap.get(m.providerID)!))
      }),

      getModelsByProvider: Effect.fn("ModelCatalog.getModelsByProvider")(function* (providerID) {
        const all = yield* result.allModels()
        return all.filter((m) => m.providerID === providerID)
      }),

      refresh: Effect.fn("ModelCatalog.refresh")(function* () {
        const models = yield* fetchAllModels()
        snap = { models, timestamp: Date.now() }
        return snap as CatalogSnapshot
      }) as () => Effect.Effect<CatalogSnapshot, never, never>,

      snapshot: Effect.fn("ModelCatalog.snapshot")(function* () {
        return snap
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
