export * as KnowledgeSourceRegistry from "./knowledge-source-registry"

import { Context, Effect, Layer, Ref } from "effect"
import type { KnowledgeSourceType } from "../integration/execution-package"

export interface KnowledgeProvider {
  readonly type: KnowledgeSourceType
  readonly description: string
  readonly capabilities: readonly string[]
  readonly enabled: boolean
}

export interface Interface {
  readonly register: (provider: KnowledgeProvider) => Effect.Effect<void>
  readonly getAll: Effect.Effect<readonly KnowledgeProvider[]>
  readonly getByType: (type: KnowledgeSourceType) => Effect.Effect<KnowledgeProvider | undefined>
  readonly discover: (required: readonly KnowledgeSourceType[]) => Effect.Effect<readonly KnowledgeProvider[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeSourceRegistry") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const providers = yield* Ref.make<KnowledgeProvider[]>([])

    const register: Interface["register"] = Effect.fn("KnowledgeSourceRegistry.register")(function* (provider) {
      yield* Ref.update(providers, (p) => [...p.filter((x) => x.type !== provider.type), provider])
    })

    const getAll = Effect.map(Ref.get(providers), (p) => p as readonly KnowledgeProvider[])

    const getByType: Interface["getByType"] = Effect.fn("KnowledgeSourceRegistry.getByType")(function* (type) {
      const all = yield* Ref.get(providers)
      return all.find((p) => p.type === type)
    })

    const discover: Interface["discover"] = Effect.fn("KnowledgeSourceRegistry.discover")(function* (required) {
      const all = yield* Ref.get(providers)
      return all.filter((p) => p.enabled && required.includes(p.type))
    })

    return Service.of({ register, getAll, getByType, discover })
  }),
)

export { layer }
