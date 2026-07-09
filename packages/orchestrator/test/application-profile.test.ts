import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"

const layer = Layer.mergeAll(ApplicationProfile.layer)
const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

test("register and get profile", async () => {
  const profile = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      yield* svc.register({
        name: "MyApp",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "commerce",
        description: "My application",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.get()
    }),
  )
  expect(profile).toBeDefined()
  expect(profile!.name).toBe("MyApp")
  expect(profile!.applicationType).toBe("web")
  expect(profile!.businessDomain).toBe("commerce")
})

test("get returns undefined before registration", async () => {
  const profile = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      return yield* svc.get()
    }),
  )
  expect(profile).toBeUndefined()
})

test("update profile", async () => {
  const profile = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      yield* svc.register({
        name: "App1",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "general",
        description: "Test app",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      yield* svc.update({
        name: "App1 Updated",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "general",
        description: "Updated app",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.get()
    }),
  )
  expect(profile!.name).toBe("App1 Updated")
})

test("getApplicationType", async () => {
  const appType = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      yield* svc.register({
        name: "App",
        version: "1.0.0",
        applicationType: "desktop",
        businessDomain: "general",
        description: "Desktop app",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.getApplicationType()
    }),
  )
  expect(appType).toBe("desktop")
})

test("getBusinessDomain", async () => {
  const domain = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      yield* svc.register({
        name: "App",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "analytics",
        description: "Analytics app",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.getBusinessDomain()
    }),
  )
  expect(domain).toBe("analytics")
})
