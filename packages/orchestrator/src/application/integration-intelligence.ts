export * as IntegrationIntelligence from "./integration-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationConnectors, type ApplicationConnector } from "./application-connectors"

export interface ExternalAPI {
  readonly name: string
  readonly protocol: string
  readonly authType: string | undefined
  readonly endpoints: readonly string[]
}

export interface IntegrationFlow {
  readonly source: string
  readonly target: string
  readonly type: "sync" | "async" | "event-driven"
  readonly dataDirection: "inbound" | "outbound" | "bidirectional"
}

export interface IntegrationAnalysis {
  readonly connectors: readonly ApplicationConnector[]
  readonly externalAPIs: readonly ExternalAPI[]
  readonly integrationFlows: readonly IntegrationFlow[]
  readonly authMethods: readonly string[]
  readonly synchronizations: readonly string[]
  readonly dataMovements: readonly string[]
  readonly recommendations: readonly string[]
}

export interface Interface {
  readonly analyze: () => Effect.Effect<IntegrationAnalysis>
  readonly getExternalAPIs: () => Effect.Effect<readonly ExternalAPI[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/IntegrationIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const connectorsService = yield* ApplicationConnectors.Service

    const analyze: Interface["analyze"] = Effect.fn("IntegrationIntelligence.analyze")(function* () {
      const connectors = yield* connectorsService.getAll()
      const externalAPIs: ExternalAPI[] = connectors.map((c) => ({
        name: c.name,
        protocol: c.protocol,
        authType: c.configSchema?.auth_type,
        endpoints: c.supportedActions,
      }))

      const integrationFlows: IntegrationFlow[] = connectors.map((c) => ({
        source: c.name,
        target: "external",
        type: "sync" as const,
        dataDirection: "bidirectional" as const,
      }))

      return {
        connectors,
        externalAPIs,
        integrationFlows,
        authMethods: [...new Set(externalAPIs.map((a) => a.authType).filter((a): a is string => a !== undefined))],
        synchronizations: connectors.filter((c) => c.protocol === "event").map((c) => c.name),
        dataMovements: connectors.flatMap((c) => c.supportedActions),
        recommendations: [],
      }
    })

    return Service.of({
      analyze,
      getExternalAPIs: Effect.fn("IntegrationIntelligence.getExternalAPIs")(function* () {
        const result = yield* analyze()
        return result.externalAPIs
      }),
    })
  }),
)

export { layer }
