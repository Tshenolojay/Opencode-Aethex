import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"
import { ApplicationDiscovery } from "../src/application/application-discovery"

const layer = ApplicationDiscovery.layer.pipe(Layer.provideMerge(ApplicationProfile.layer))
const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

test("discover returns result from registered profile", async () => {
  const result = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "DiscoveryApp",
        version: "1.0.0",
        applicationType: "mobile",
        businessDomain: "communication",
        description: "Social app",
        modules: [{ name: "FeedModule", version: "1.0.0", description: "User feed", enabled: true, capabilities: [] }],
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
  expect(result.detectedDomain).toBe("communication")
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
        description: "App with modules",
        modules: [
          { name: "M1", version: "1.0.0", description: "One", enabled: true, capabilities: [] },
          { name: "M2", version: "1.0.0", description: "Two", enabled: false, capabilities: [] },
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
        businessDomain: "analytics",
        description: "Analytics domain app",
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
  expect(domain).toBe("analytics")
})
