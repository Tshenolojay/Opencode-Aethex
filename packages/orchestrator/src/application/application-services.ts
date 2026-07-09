export * as ApplicationServices from "./application-services"

import { Context, Effect, Layer, Ref } from "effect"

export type ServiceStatus = "active" | "degraded" | "maintenance" | "inactive"

export interface ApplicationService {
  readonly name: string
  readonly description: string
  readonly version: string | undefined
  readonly status: ServiceStatus
  readonly endpoints: readonly string[]
  readonly dependencies: readonly string[]
  readonly providesCapabilities: readonly string[]
}

export interface Interface {
  readonly register: (service: ApplicationService) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly ApplicationService[]>
  readonly getByName: (name: string) => Effect.Effect<ApplicationService | undefined>
  readonly getServicesByCapability: (capability: string) => Effect.Effect<readonly ApplicationService[]>
  readonly unregister: (name: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationServices") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const services = yield* Ref.make<Map<string, ApplicationService>>(new Map())

    return Service.of({
      register: Effect.fn("ApplicationServices.register")(function* (service) {
        yield* Ref.update(services, (map) => { map.set(service.name, service); return map })
      }),
      getAll: Effect.fn("ApplicationServices.getAll")(function* () {
        const map = yield* Ref.get(services)
        return Array.from(map.values())
      }),
      getByName: Effect.fn("ApplicationServices.getByName")(function* (name) {
        const map = yield* Ref.get(services)
        return map.get(name)
      }),
      getServicesByCapability: Effect.fn("ApplicationServices.getServicesByCapability")(function* (capability) {
        const map = yield* Ref.get(services)
        return Array.from(map.values()).filter((s) => s.providesCapabilities.includes(capability))
      }),
      unregister: Effect.fn("ApplicationServices.unregister")(function* (name) {
        yield* Ref.update(services, (map) => { map.delete(name); return map })
      }),
    })
  }),
)

export { layer }
