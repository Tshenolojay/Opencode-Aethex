import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { SessionIntegration } from "../src/session-integration"
import { OrchestratorService } from "../src/orchestrator"

const layer = SessionIntegration.layer.pipe(Layer.provideMerge(OrchestratorService.layer))

const run = <A, E>(effect: Effect.Effect<A, E, SessionIntegration.Service>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E>)

describe("SessionIntegration confidence → specialists", () => {
  test("high-confidence general chat bypasses specialists", async () => {
    const result = await run(
      Effect.gen(function* () {
        const service = yield* SessionIntegration.Service
        const pkg = yield* service.integrate({
          promptText: "hello, how are you?",
          sessionID: "ses_high_confidence",
          filesAttached: false,
          conversationLength: 1,
          repositorySize: 10,
          contextAvailable: true,
          previousToolResults: false,
          sessionMetadata: undefined,
          assistantResponses: undefined,
          toolResults: undefined,
          projectInfo: undefined,
        })
        const summary = yield* service.summary(pkg)
        return { pkg, summary }
      }),
    )

    expect(result.pkg.confidence).toBe("high")
    expect(result.summary.status).toBe("bypassed")
    expect(result.summary.needsOrchestration).toBe(false)
    expect(result.summary.specialists ?? []).toHaveLength(0)
  })

  test("low-confidence architecture prompt plans specialists", async () => {
    const result = await run(
      Effect.gen(function* () {
        const service = yield* SessionIntegration.Service
        const pkg = yield* service.integrate({
          promptText: "redesign the architecture and plan a structured refactor across modules",
          sessionID: "ses_low_confidence",
          filesAttached: false,
          conversationLength: 40,
          repositorySize: 50000,
          contextAvailable: false,
          previousToolResults: false,
          sessionMetadata: undefined,
          assistantResponses: undefined,
          toolResults: undefined,
          projectInfo: "/tmp/project",
        })
        const summary = yield* service.summary(pkg)
        return { pkg, summary }
      }),
    )

    expect(result.pkg.confidence === "low" || result.pkg.confidence === "medium").toBe(true)
    expect(result.summary.needsOrchestration).toBe(true)
    expect((result.summary.specialists?.length ?? 0) > 0).toBe(true)
    expect(result.summary.specialists?.[0]?.role).toBeDefined()
    expect(result.summary.specialists?.[0]?.status).toBeDefined()
  })
})
