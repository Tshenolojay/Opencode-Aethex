export * as ApplicationHealth from "./application-health"

import { Context, Effect, Layer, Ref } from "effect"
import { ApplicationServices, type ApplicationService, type ServiceStatus } from "./application-services"
import { ApplicationConnectors, type ApplicationConnector } from "./application-connectors"

export interface ServiceHealth {
  readonly name: string
  readonly status: ServiceStatus
  readonly uptime: number | undefined
  readonly lastChecked: number
}

export interface ConnectorHealth {
  readonly name: string
  readonly enabled: boolean
  readonly reachable: boolean | undefined
  readonly lastChecked: number
}

export interface ApplicationHealthReport {
  readonly overall: "healthy" | "degraded" | "critical"
  readonly serviceHealth: readonly ServiceHealth[]
  readonly connectorHealth: readonly ConnectorHealth[]
  readonly degradedServices: readonly string[]
  readonly inactiveServices: readonly string[]
  readonly metrics: {
    readonly totalServices: number
    readonly activeServices: number
    readonly degradedCount: number
    readonly inactiveCount: number
    readonly totalConnectors: number
    readonly enabledConnectors: number
  }
}

export interface Interface {
  readonly check: () => Effect.Effect<ApplicationHealthReport>
  readonly checkService: (name: string) => Effect.Effect<ServiceHealth | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationHealth") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const servicesService = yield* ApplicationServices.Service
    const connectorsService = yield* ApplicationConnectors.Service

    const check: Interface["check"] = Effect.fn("ApplicationHealth.check")(function* () {
      const services = yield* servicesService.getAll()
      const connectors = yield* connectorsService.getAll()
      const now = Date.now()

      const serviceHealth: ServiceHealth[] = services.map((s) => ({
        name: s.name,
        status: s.status,
        uptime: s.status === "active" ? 100 : undefined,
        lastChecked: now,
      }))

      const connectorHealth: ConnectorHealth[] = connectors.map((c) => ({
        name: c.name,
        enabled: c.enabled,
        reachable: c.enabled ? true : undefined,
        lastChecked: now,
      }))

      const degradedServices = serviceHealth.filter((s) => s.status === "degraded").map((s) => s.name)
      const inactiveServices = serviceHealth.filter((s) => s.status === "inactive" || s.status === "maintenance").map((s) => s.name)
      const activeCount = serviceHealth.filter((s) => s.status === "active").length
      const degradedCount = degradedServices.length
      const inactiveCount = inactiveServices.length
      const enabledCount = connectorHealth.filter((c) => c.enabled).length

      const overall = degradedCount > 0 ? "degraded" as const : inactiveCount > activeCount ? "critical" as const : "healthy" as const

      return {
        overall,
        serviceHealth,
        connectorHealth,
        degradedServices,
        inactiveServices,
        metrics: {
          totalServices: services.length,
          activeServices: activeCount,
          degradedCount,
          inactiveCount,
          totalConnectors: connectors.length,
          enabledConnectors: enabledCount,
        },
      }
    })

    return Service.of({
      check,
      checkService: Effect.fn("ApplicationHealth.checkService")(function* (name) {
        const report = yield* check()
        return report.serviceHealth.find((s) => s.name === name)
      }),
    })
  }),
)

export { layer }
