import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationConnectors } from "../src/application/application-connectors"

const layer = Layer.mergeAll(ApplicationConnectors.layer)
const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

test("register and get connector", async () => {
  const connector = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationConnectors.Service
      yield* svc.register({
        id: "conn-1",
        name: "REST API",
        protocol: "rest",
        baseUrl: "https://api.example.com",
        enabled: true,
        supportedActions: ["read", "write"],
        configSchema: undefined,
      })
      return yield* svc.get("conn-1")
    }),
  )
  expect(connector).toBeDefined()
  expect(connector!.name).toBe("REST API")
  expect(connector!.protocol).toBe("rest")
  expect(connector!.enabled).toBe(true)
})

test("getAll returns all connectors", async () => {
  const connectors = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationConnectors.Service
      yield* svc.register({
        id: "c1", name: "C1", protocol: "rest",
        baseUrl: undefined, enabled: true,
        supportedActions: [], configSchema: undefined,
      })
      yield* svc.register({
        id: "c2", name: "C2", protocol: "graphql",
        baseUrl: undefined, enabled: false,
        supportedActions: [], configSchema: undefined,
      })
      return yield* svc.getAll()
    }),
  )
  expect(connectors.length).toBe(2)
})

test("getByProtocol filters correctly", async () => {
  const results = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationConnectors.Service
      yield* svc.register({
        id: "ws1", name: "WS", protocol: "websocket",
        baseUrl: undefined, enabled: true,
        supportedActions: [], configSchema: undefined,
      })
      yield* svc.register({
        id: "ws2", name: "WS2", protocol: "websocket",
        baseUrl: undefined, enabled: true,
        supportedActions: [], configSchema: undefined,
      })
      yield* svc.register({
        id: "r1", name: "REST", protocol: "rest",
        baseUrl: undefined, enabled: true,
        supportedActions: [], configSchema: undefined,
      })
      return yield* svc.getByProtocol("websocket")
    }),
  )
  expect(results.length).toBe(2)
  expect(results.every((c) => c.protocol === "websocket")).toBe(true)
})

test("unregister removes connector", async () => {
  const connectors = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationConnectors.Service
      yield* svc.register({
        id: "to-go", name: "Temp", protocol: "custom",
        baseUrl: undefined, enabled: true,
        supportedActions: [], configSchema: undefined,
      })
      yield* svc.unregister("to-go")
      return yield* svc.getAll()
    }),
  )
  expect(connectors.some((c) => c.id === "to-go")).toBe(false)
})
