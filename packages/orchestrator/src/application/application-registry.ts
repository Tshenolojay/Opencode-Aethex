export * as ApplicationRegistry from "./application-registry"

import { Context, Effect, Layer, Ref } from "effect"

export type ApplicationCategory =
  | "marketplace" | "crm" | "erp" | "accounting" | "healthcare" | "education"
  | "government" | "e-commerce" | "analytics" | "automation" | "communication"
  | "finance" | "ai-assistant" | "workflow" | "business" | "unknown"

export interface AppRegistryEntry {
  readonly id: string
  readonly name: string
  readonly category: ApplicationCategory
  readonly description: string
  readonly version: string | undefined
  readonly tags: readonly string[]
  readonly registeredAt: number
  readonly metadata: Readonly<Record<string, string>>
}

export interface Interface {
  readonly register: (entry: AppRegistryEntry) => Effect.Effect<void>
  readonly get: (id: string) => Effect.Effect<AppRegistryEntry | undefined>
  readonly getAll: () => Effect.Effect<readonly AppRegistryEntry[]>
  readonly getByCategory: (category: ApplicationCategory) => Effect.Effect<readonly AppRegistryEntry[]>
  readonly search: (query: string) => Effect.Effect<readonly AppRegistryEntry[]>
  readonly unregister: (id: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationRegistry") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const entries = yield* Ref.make<Map<string, AppRegistryEntry>>(new Map())

    return Service.of({
      register: Effect.fn("ApplicationRegistry.register")(function* (entry) {
        yield* Ref.update(entries, (m) => { m.set(entry.id, entry); return m })
      }),
      get: Effect.fn("ApplicationRegistry.get")(function* (id) {
        const m = yield* Ref.get(entries)
        return m.get(id)
      }),
      getAll: Effect.fn("ApplicationRegistry.getAll")(function* () {
        const m = yield* Ref.get(entries)
        return Array.from(m.values())
      }),
      getByCategory: Effect.fn("ApplicationRegistry.getByCategory")(function* (category) {
        const m = yield* Ref.get(entries)
        return Array.from(m.values()).filter((e) => e.category === category)
      }),
      search: Effect.fn("ApplicationRegistry.search")(function* (query) {
        const m = yield* Ref.get(entries)
        const lower = query.toLowerCase()
        return Array.from(m.values()).filter(
          (e) => e.name.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower) || e.tags.some((t) => t.includes(lower)),
        )
      }),
      unregister: Effect.fn("ApplicationRegistry.unregister")(function* (id) {
        yield* Ref.update(entries, (m) => { m.delete(id); return m })
      }),
    })
  }),
)

export { layer }
