export * as Catalog from "./catalog"

import { Context, Effect } from "effect"

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
