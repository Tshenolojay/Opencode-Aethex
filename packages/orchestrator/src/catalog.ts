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

export interface Interface {
  readonly replace: (snapshot: RuntimeCatalogSnapshot) => Effect.Effect<void>
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

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    let providers: ProviderData[] = []
    let models: ModelData[] = []
    let defaultModel: ModelData | undefined

    const replace: Interface["replace"] = Effect.fn("Catalog.replace")(function* (snapshot) {
      providers = [...snapshot.providers]
      models = [...snapshot.models]
      defaultModel = snapshot.defaultModel
        ? models.find(
            (model) =>
              model.providerID === snapshot.defaultModel?.providerID &&
              model.id === snapshot.defaultModel?.modelID,
          )
        : undefined
    })

    return Service.of({
      replace,
      provider: {
        get: (id) => Effect.succeed(providers.find((p) => p.id === id)),
        all: () => Effect.succeed(providers),
        available: () => Effect.succeed(providers.filter((p) => !p.disabled)),
      },
      model: {
        get: (providerID, modelID) => Effect.succeed(models.find((m) => m.providerID === providerID && m.id === modelID)),
        all: () => Effect.succeed(models),
        available: () => Effect.succeed(models.filter((m) => m.enabled)),
        default: () => Effect.succeed(defaultModel),
        small: (providerID) => Effect.succeed(models.find((m) => m.providerID === providerID && m.limit.context <= 32000)),
      },
    })
  }),
)

export { layer }
