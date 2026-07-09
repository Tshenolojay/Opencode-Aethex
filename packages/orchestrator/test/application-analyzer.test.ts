import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"
import { ApplicationAnalyzer } from "../src/application/application-analyzer"

const layer = ApplicationAnalyzer.layer.pipe(Layer.provideMerge(ApplicationProfile.layer))
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("analyze returns structure with registered profile", async () => {
  const result = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationAnalyzer.Service
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "App",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "ecommerce",
        modules: [{ name: "ModuleA", description: "First module", enabled: true }],
        capabilities: ["commerce", "crm"],
        supportedWorkflows: ["order-processing", "customer-support"],
        permissions: [],
        executionBoundaries: ["billing", "auth"],
      })
      return yield* svc.analyze()
    }),
  )
  expect(result.architecture.length).toBeGreaterThanOrEqual(1)
  expect(result.businessLogic.length).toBe(1)
  expect(result.businessLogic[0].domain).toBe("ecommerce")
  expect(result.moduleRelationships.length).toBe(0)
  expect(result.integrationPoints.length).toBe(2)
  expect(result.workflowCount).toBe(2)
  expect(result.capabilityCount).toBe(2)
})

test("analyze with multiple modules creates relationships", async () => {
  const result = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationAnalyzer.Service
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "App",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "general",
        modules: [
          { name: "ModuleA", description: "First", enabled: true },
          { name: "ModuleB", description: "Second", enabled: true },
        ],
        capabilities: [],
        supportedWorkflows: [],
        permissions: [],
        executionBoundaries: [],
      })
      return yield* svc.analyze()
    }),
  )
  expect(result.moduleRelationships.length).toBe(1)
  expect(result.moduleRelationships[0].source).toBe("ModuleB")
  expect(result.moduleRelationships[0].target).toBe("ModuleA")
})

test("getArchitectureInsights", async () => {
  const insights = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationAnalyzer.Service
      return yield* svc.getArchitectureInsights()
    }),
  )
  expect(Array.isArray(insights)).toBe(true)
})

test("getModuleRelationships", async () => {
  const relationships = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationAnalyzer.Service
      return yield* svc.getModuleRelationships()
    }),
  )
  expect(Array.isArray(relationships)).toBe(true)
})
