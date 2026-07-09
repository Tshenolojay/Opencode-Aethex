import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationServices } from "../src/application/application-services"

const layer = Layer.mergeAll(ApplicationServices.layer)
const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

test("register and getAll services", async () => {
  const services = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationServices.Service
      yield* svc.register({
        name: "AuthService",
        description: "Authentication service",
        version: "1.0.0",
        status: "active",
        endpoints: ["/auth/login"],
        dependencies: [],
        providesCapabilities: ["auth"],
      })
      return yield* svc.getAll()
    }),
  )
  expect(services.length).toBe(1)
  expect(services[0].name).toBe("AuthService")
  expect(services[0].status).toBe("active")
})

test("getByName returns specific service", async () => {
  const service = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationServices.Service
      yield* svc.register({
        name: "PaymentService",
        description: "Payment processing",
        version: "2.0.0",
        status: "active",
        endpoints: ["/pay/charge"],
        dependencies: ["AuthService"],
        providesCapabilities: ["commerce"],
      })
      return yield* svc.getByName("PaymentService")
    }),
  )
  expect(service).toBeDefined()
  expect(service!.version).toBe("2.0.0")
  expect(service!.dependencies).toContain("AuthService")
})

test("getByName returns undefined for missing service", async () => {
  const service = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationServices.Service
      return yield* svc.getByName("NonExistent")
    }),
  )
  expect(service).toBeUndefined()
})

test("getServicesByCapability", async () => {
  const results = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationServices.Service
      yield* svc.register({
        name: "Svc1",
        description: "",
        version: undefined,
        status: "active",
        endpoints: [],
        dependencies: [],
        providesCapabilities: ["analytics"],
      })
      yield* svc.register({
        name: "Svc2",
        description: "",
        version: undefined,
        status: "active",
        endpoints: [],
        dependencies: [],
        providesCapabilities: ["analytics", "crm"],
      })
      return yield* svc.getServicesByCapability("analytics")
    }),
  )
  expect(results.length).toBe(2)
})

test("unregister removes service", async () => {
  const services = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationServices.Service
      yield* svc.register({
        name: "TempService",
        description: "",
        version: undefined,
        status: "inactive",
        endpoints: [],
        dependencies: [],
        providesCapabilities: [],
      })
      yield* svc.unregister("TempService")
      return yield* svc.getAll()
    }),
  )
  expect(services.some((s) => s.name === "TempService")).toBe(false)
})
