export * as Catalog from "./catalog"

import { Context, Effect, Layer } from "effect"

export interface ModelData {
  readonly id: string
  readonly providerID: string
  readonly family?: string
  readonly name: string
  readonly capabilities: { readonly tools: boolean; readonly input: readonly string[]; readonly output: readonly string[] }
  readonly status: "alpha" | "beta" | "deprecated" | "active"
  readonly enabled: boolean
  readonly limit: { readonly context: number; readonly input?: number; readonly output: number }
  readonly cost: readonly { readonly input: number; readonly output: number }[]
}

export interface ProviderData {
  readonly id: string
  readonly name: string
  readonly disabled?: boolean
}

export interface RuntimeCatalogSnapshot {
  readonly providers: readonly ProviderData[]
  readonly models: readonly ModelData[]
  readonly defaultModel?: {
    readonly providerID: string
    readonly modelID: string
  }
}

export const RuntimeCatalog = Context.Reference<RuntimeCatalogSnapshot>(
  "@opencode/orchestrator/RuntimeCatalog",
  {
    defaultValue: () => ({ providers: [], models: [] }),
  },
)

export interface Interface {
  readonly provider: {
    readonly get: (providerID: string) => Effect.Effect<ProviderData | undefined>
    readonly all: () => Effect.Effect<ProviderData[]>
    readonly available: () => Effect.Effect<ProviderData[]>
  }
  readonly model: {
    readonly get: (providerID: string, modelID: string) => Effect.Effect<ModelData | undefined>
    readonly all: () => Effect.Effect<ModelData[]>
    readonly available: () => Effect.Effect<ModelData[]>
    readonly default: () => Effect.Effect<ModelData | undefined>
    readonly small: (providerID: string) => Effect.Effect<ModelData | undefined>
  }
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Catalog") {}

const layer = Layer.succeed(
  Service,
  Service.of({
    provider: {
      get: (id) => Effect.map(RuntimeCatalog, (snapshot) => snapshot.providers.find((provider) => provider.id === id)),
      all: () => Effect.map(RuntimeCatalog, (snapshot) => [...snapshot.providers]),
      available: () =>
        Effect.map(RuntimeCatalog, (snapshot) => snapshot.providers.filter((provider) => !provider.disabled)),
    },
    model: {
      get: (providerID, modelID) =>
        Effect.map(RuntimeCatalog, (snapshot) =>
          snapshot.models.find((model) => model.providerID === providerID && model.id === modelID),
        ),
      all: () => Effect.map(RuntimeCatalog, (snapshot) => [...snapshot.models]),
      available: () => Effect.map(RuntimeCatalog, (snapshot) => snapshot.models.filter((model) => model.enabled)),
      default: () =>
        Effect.map(RuntimeCatalog, (snapshot) =>
          snapshot.defaultModel
            ? snapshot.models.find(
                (model) =>
                  model.providerID === snapshot.defaultModel?.providerID &&
                  model.id === snapshot.defaultModel?.modelID,
              )
            : undefined,
        ),
      small: (providerID) =>
        Effect.map(RuntimeCatalog, (snapshot) =>
          snapshot.models.find((model) => model.providerID === providerID && model.limit.context <= 32000),
        ),
    },
  }),
)

export { layer }
