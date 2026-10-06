import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { ExecutionAdvisor } from "../src/intelligence/execution-advisor"
import { empty } from "../src/integration/execution-package"

describe("ExecutionAdvisor tool advice", () => {
  test("uses only executable V2 core tool IDs", async () => {
    const base = empty("ses_execution_advisor_tools")
    const pkg = {
      ...base,
      taskClassification: {
        ...base.taskClassification,
        type: "debug" as const,
        complexity: 5,
        requiresSearch: true,
        requiresContext: true,
        requiresDependencyGraph: true,
        requiresVerification: true,
      },
    }

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const advisor = yield* ExecutionAdvisor.Service
        return yield* advisor.advise(pkg)
      }).pipe(Effect.provide(ExecutionAdvisor.layer)),
    )

    expect(result.toolAdvice?.suggestedTools).toEqual(["glob", "grep", "read", "bash"])
    expect(result.toolAdvice?.verificationTools).toEqual(["bash"])
    expect(result.toolAdvice?.suggestedTools).not.toContain("dependency-graph")
    expect(result.toolAdvice?.suggestedTools).not.toContain("run-tests")
    expect(result.toolAdvice?.suggestedTools).not.toContain("bulk-edit")
  })
})
