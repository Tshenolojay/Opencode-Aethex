export * as ApplicationConnectors from "./application-connectors"

import { Context, Effect, Layer, Ref } from "effect"

export type ConnectorProtocol = "rest" | "graphql" | "grpc" | "websocket" | "event" | "file" | "database" | "custom"

export interface ApplicationConnector {
  readonly id: string
  readonly name: string
  readonly protocol: ConnectorProtocol
  readonly baseUrl: string | undefined
  readonly enabled: boolean
  readonly supportedActions: readonly string[]
  readonly configSchema: Record<string, string> | undefined
}

export interface Interface {
  readonly register: (connector: ApplicationConnector) => Effect.Effect<void>
  readonly get: (id: string) => Effect.Effect<ApplicationConnector | undefined>
  readonly getAll: () => Effect.Effect<readonly ApplicationConnector[]>
  readonly getByProtocol: (protocol: ConnectorProtocol) => Effect.Effect<readonly ApplicationConnector[]>
  readonly unregister: (id: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationConnectors") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const connectors = yield* Ref.make<Map<string, ApplicationConnector>>(new Map())

    return Service.of({
      register: Effect.fn("ApplicationConnectors.register")(function* (connector) {
        yield* Ref.update(connectors, (map) => { map.set(connector.id, connector); return map })
      }),
      get: Effect.fn("ApplicationConnectors.get")(function* (id) {
        const map = yield* Ref.get(connectors)
        return map.get(id)
      }),
      getAll: Effect.fn("ApplicationConnectors.getAll")(function* () {
        const map = yield* Ref.get(connectors)
        return Array.from(map.values())
      }),
      getByProtocol: Effect.fn("ApplicationConnectors.getByProtocol")(function* (protocol) {
        const map = yield* Ref.get(connectors)
        return Array.from(map.values()).filter((c) => c.protocol === protocol)
      }),
      unregister: Effect.fn("ApplicationConnectors.unregister")(function* (id) {
        yield* Ref.update(connectors, (map) => { map.delete(id); return map })
      }),
    })
  }),
)

export { layer }
