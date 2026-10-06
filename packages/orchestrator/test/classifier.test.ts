import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { TaskClassifier } from "../src/classifier/classifier"

describe("TaskClassifier rich signals", () => {
  test("current prompt remains the primary classification", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const classifier = yield* TaskClassifier.Service
        return yield* classifier.classifyRich({
          signals: [
            { signal: "prompt-text", text: "fix the login error that crashes authentication", weight: 1 },
            { signal: "previous-responses", text: "redesign the architecture and plan the module structure", weight: 0.4 },
            { signal: "project-info", text: "directory=/workspace/build-system", weight: 0.6 },
          ],
          sessionMetadata: undefined,
          assistantResponses: ["redesign the architecture and plan the module structure"],
          toolResults: undefined,
          projectInfo: "directory=/workspace/build-system",
        })
      }).pipe(Effect.provide(TaskClassifier.layer)),
    )

    expect(result[0]?.type).toBe("bug-fix")
    expect(result.some((classification) => classification.type === "architecture-design")).toBe(true)
  })
})
