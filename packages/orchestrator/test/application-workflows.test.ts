import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationWorkflows } from "../src/application/application-workflows"

const layer = Layer.mergeAll(ApplicationWorkflows.layer)
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("getWorkflows returns built-in workflows", async () => {
  const wfs = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationWorkflows.Service
      return yield* svc.getWorkflows()
    }),
  )
  expect(wfs.length).toBeGreaterThanOrEqual(8)
  expect(wfs.some((w) => w.id === "marketing-campaign")).toBe(true)
  expect(wfs.some((w) => w.id === "order-processing")).toBe(true)
  expect(wfs.some((w) => w.id === "planning")).toBe(true)
})

test("getWorkflowsByCategory filters correctly", async () => {
  const business = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationWorkflows.Service
      return yield* svc.getWorkflowsByCategory("business")
    }),
  )
  expect(business.every((w) => w.category === "business")).toBe(true)
  expect(business.some((w) => w.id === "marketing-campaign")).toBe(true)
})

test("registerWorkflow adds custom workflow", async () => {
  const wfs = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationWorkflows.Service
      yield* svc.registerWorkflow({
        id: "custom-flow",
        name: "Custom Flow",
        description: "Test flow",
        category: "automation",
        steps: ["step1", "step2"],
        requiredCapabilities: [],
        estimatedComplexity: 0.5,
        typicalDuration: "minutes",
      })
      return yield* svc.getWorkflows()
    }),
  )
  expect(wfs.some((w) => w.id === "custom-flow")).toBe(true)
})

test("discoverWorkflows returns all workflows", async () => {
  const wfs = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationWorkflows.Service
      return yield* svc.discoverWorkflows()
    }),
  )
  expect(wfs.length).toBeGreaterThanOrEqual(8)
})
