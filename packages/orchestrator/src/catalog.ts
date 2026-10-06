export * as Catalog from "./catalog"

import { Context, Effect, FiberRef, Layer } from "effect"

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
    // SessionIntegration is global, but orchestration can run concurrently for
    // different locations. Keep each runtime catalog snapshot fiber-local so a
    // prompt can never route against another session's provider/model inventory.
    const current = yield* FiberRef.make<RuntimeCatalogSnapshot>({
      providers: [],
      models: [],
    })

    const read = FiberRef.get(current)

    const replace: Interface["replace"] = Effect.fn("Catalog.replace")(function* (snapshot) {
      yield* FiberRef.set(current, {
        providers: [...snapshot.providers],
        models: [...snapshot.models],
        defaultModel: snapshot.defaultModel,
      })
    })

    return Service.of({
      replace,
      provider: {
        get: (id) => Effect.map(read, (snapshot) => snapshot.providers.find((provider) => provider.id === id)),
        all: () => Effect.map(read, (snapshot) => [...snapshot.providers]),
        available: () =>
          Effect.map(read, (snapshot) => snapshot.providers.filter((provider) => !provider.disabled)),
      },
      model: {
        get: (providerID, modelID) =>
          Effect.map(read, (snapshot) =>
            snapshot.models.find((model) => model.providerID === providerID && model.id === modelID),
          ),
        all: () => Effect.map(read, (snapshot) => [...snapshot.models]),
        available: () => Effect.map(read, (snapshot) => snapshot.models.filter((model) => model.enabled)),
        default: () =>
          Effect.map(read, (snapshot) =>
            snapshot.defaultModel
              ? snapshot.models.find(
                  (model) =>
                    model.providerID === snapshot.defaultModel?.providerID &&
                    model.id === snapshot.defaultModel?.modelID,
                )
              : undefined,
          ),
        small: (providerID) =>
          Effect.map(read, (snapshot) =>
            snapshot.models.find((model) => model.providerID === providerID && model.limit.context <= 32000),
          ),
      },
    })
  }),
)

export { layer }
