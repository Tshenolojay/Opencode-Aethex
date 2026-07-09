import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationContext } from "../src/application/application-context"

const layer = Layer.mergeAll(ApplicationContext.layer)
const run = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

test("getSnapshot returns default state", async () => {
  const snapshot = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationContext.Service
      return yield* svc.getSnapshot()
    }),
  )
  expect(snapshot.environment).toBe("unknown")
  expect(snapshot.currentWorkflow).toBeUndefined()
  expect(snapshot.recentWorkflows).toEqual([])
  expect(snapshot.timestamp).toBeGreaterThan(0)
})

test("setCurrentWorkflow and getSnapshot reflects it", async () => {
  const snapshot = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationContext.Service
      yield* svc.setCurrentWorkflow("order-processing")
      return yield* svc.getSnapshot()
    }),
  )
  expect(snapshot.currentWorkflow).toBe("order-processing")
})

test("setEnvironment", async () => {
  const snapshot = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationContext.Service
      yield* svc.setEnvironment("production")
      return yield* svc.getSnapshot()
    }),
  )
  expect(snapshot.environment).toBe("production")
})

test("recordWorkflowUse tracks workflow history", async () => {
  const snapshot = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationContext.Service
      yield* svc.recordWorkflowUse("wf-1")
      yield* svc.recordWorkflowUse("wf-2")
      yield* svc.recordWorkflowUse("wf-3")
      return yield* svc.getSnapshot()
    }),
  )
  expect(snapshot.recentWorkflows).toContain("wf-1")
  expect(snapshot.recentWorkflows).toContain("wf-2")
  expect(snapshot.recentWorkflows).toContain("wf-3")
  expect(snapshot.recentWorkflows.length).toBe(3)
})
