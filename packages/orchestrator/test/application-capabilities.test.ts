import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationCapabilities } from "../src/application/application-capabilities"

const layer = Layer.mergeAll(ApplicationCapabilities.layer)
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("getAvailableCapabilities returns built-in capabilities", async () => {
  const caps = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationCapabilities.Service
      return yield* svc.getAvailableCapabilities()
    }),
  )
  expect(caps.length).toBeGreaterThanOrEqual(14)
  expect(caps.some((c) => c.name === "marketing")).toBe(true)
  expect(caps.some((c) => c.name === "commerce")).toBe(true)
  expect(caps.some((c) => c.name === "coding")).toBe(true)
})

test("getCapabilitiesByCategory filters correctly", async () => {
  const core = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationCapabilities.Service
      return yield* svc.getCapabilitiesByCategory("core")
    }),
  )
  expect(core.every((c) => c.category === "core")).toBe(true)
  expect(core.some((c) => c.name === "commerce")).toBe(true)
})

test("registerCustomCapability adds to the list", async () => {
  const caps = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationCapabilities.Service
      yield* svc.registerCustomCapability({
        name: "custom-ai",
        description: "Custom AI capability",
        category: "research",
        providedBy: [],
      })
      return yield* svc.getAvailableCapabilities()
    }),
  )
  expect(caps.some((c) => c.name === "custom-ai")).toBe(true)
})
