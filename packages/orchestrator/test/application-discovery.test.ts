import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"
import { ApplicationDiscovery } from "../src/application/application-discovery"

const layer = ApplicationDiscovery.layer.pipe(Layer.provideMerge(ApplicationProfile.layer))
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("discover returns result from registered profile", async () => {
  const result = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "DiscoveryApp",
        version: "1.0.0",
        applicationType: "mobile",
        businessDomain: "social",
        modules: [{ name: "FeedModule", description: "User feed", enabled: true }],
        capabilities: ["messaging", "analytics"],
        supportedWorkflows: ["research"],
        permissions: [],
        executionBoundaries: [],
      })
      const discovery = yield* ApplicationDiscovery.Service
      return yield* discovery.discover()
    }),
  )
  expect(result.detectedType).toBe("mobile")
  expect(result.detectedDomain).toBe("social")
  expect(result.detectedModules.length).toBe(1)
  expect(result.detectedModules[0].name).toBe("FeedModule")
  expect(result.detectedCapabilities).toContain("messaging")
  expect(result.detectedWorkflows).toContain("research")
})

test("discover returns defaults without profile", async () => {
  const result = await run(
    Effect.gen(function* () {
      const discovery = yield* ApplicationDiscovery.Service
      return yield* discovery.discover()
    }),
  )
  expect(result.detectedType).toBe("unknown")
  expect(result.detectedDomain).toBe("general")
  expect(result.detectedModules).toEqual([])
})

test("scanModules returns modules from profile", async () => {
  const modules = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "App",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "general",
        modules: [
          { name: "M1", description: "One", enabled: true },
          { name: "M2", description: "Two", enabled: false },
        ],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      const discovery = yield* ApplicationDiscovery.Service
      return yield* discovery.scanModules()
    }),
  )
  expect(modules.length).toBe(2)
})

test("inferDomain returns domain from profile", async () => {
  const domain = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
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
      const discovery = yield* ApplicationDiscovery.Service
      return yield* discovery.inferDomain()
    }),
  )
  expect(domain).toBe("healthcare")
})
