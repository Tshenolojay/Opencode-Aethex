export * as ServiceIntelligence from "./service-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationServices, type ApplicationService } from "./application-services"

export interface ServiceEndpoint {
  readonly service: string
  readonly path: string
  readonly method: string
}

export interface ServiceDependency {
  readonly source: string
  readonly target: string
}

export interface ServiceAnalysis {
  readonly services: readonly ApplicationService[]
  readonly endpoints: readonly ServiceEndpoint[]
  readonly dependencies: readonly ServiceDependency[]
  readonly backgroundServices: readonly string[]
  readonly queueServices: readonly string[]
  readonly eventSystems: readonly string[]
  readonly integrationServices: readonly string[]
  readonly ownership: Readonly<Record<string, string>>
}

export interface Interface {
  readonly analyze: () => Effect.Effect<ServiceAnalysis>
  readonly getEndpoints: () => Effect.Effect<readonly ServiceEndpoint[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ServiceIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const servicesService = yield* ApplicationServices.Service

    const analyze: Interface["analyze"] = Effect.fn("ServiceIntelligence.analyze")(function* () {
      const services = yield* servicesService.getAll()
      const endpoints: ServiceEndpoint[] = services.flatMap((s) =>
        s.endpoints.map((e) => ({ service: s.name, path: e, method: "GET" })),
      )
      const dependencies: ServiceDependency[] = services.flatMap((s) =>
        s.dependencies.map((d) => ({ source: s.name, target: d })),
      )

      return {
        services,
        endpoints,
        dependencies,
        backgroundServices: services.filter((s) => s.status === "active").map((s) => s.name),
        queueServices: [],
        eventSystems: [],
        integrationServices: services.filter((s) => s.providesCapabilities.includes("integration")).map((s) => s.name),
        ownership: Object.fromEntries(services.map((s) => [s.name, s.description])),
      }
    })

    return Service.of({
      analyze,
      getEndpoints: Effect.fn("ServiceIntelligence.getEndpoints")(function* () {
        const result = yield* analyze()
        return result.endpoints
      }),
    })
  }),
)

export { layer }
