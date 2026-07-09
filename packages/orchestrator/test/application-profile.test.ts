import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"

const layer = Layer.mergeAll(ApplicationProfile.layer)
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("register and get profile", async () => {
  const profile = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationProfile.Service
      yield* svc.register({
        name: "MyApp",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "ecommerce",
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
  expect(profile!.businessDomain).toBe("ecommerce")
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
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      yield* svc.update({ name: "App1 Updated" })
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
        businessDomain: "healthcare",
        modules: [],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.getBusinessDomain()
    }),
  )
  expect(domain).toBe("healthcare")
})
