import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { SessionV2 } from "@opencode-ai/core/session"
import { setExecutionPackage } from "@opencode-ai/core/session/execution-package-store"
import { SystemContext } from "@opencode-ai/core/system-context"
import { SystemContextOrchestration } from "@opencode-ai/core/system-context/orchestration"

describe("SystemContextOrchestration", () => {
  test("keeps high-confidence bypass prompt-transparent", async () => {
    const sessionID = SessionV2.ID.make("ses_orchestration_bypass_context")
    setExecutionPackage(sessionID, {
      sessionID,
      timestamp: Date.now(),
      currentTask: "Explain this line",
      confidence: "high",
      confidenceScore: 0.94,
      status: "bypassed",
      needsOrchestration: false,
    })

    const initialized = await Effect.runPromise(
      SystemContext.initialize(SystemContextOrchestration.load(sessionID)),
    )

    expect(initialized.baseline).toBe("")
    expect(initialized.snapshot).toEqual({})
  })

  test("injects task-tool guidance only while specialists are actually required", async () => {
    const sessionID = SessionV2.ID.make("ses_orchestration_planned_context")
    setExecutionPackage(sessionID, {
      sessionID,
      timestamp: Date.now(),
      currentTask: "Trace the dependency failure",
      confidence: "low",
      confidenceScore: 0.31,
      status: "planned",
      needsOrchestration: true,
      specialists: [
        { name: "dependency", role: "Trace dependencies", status: "planned" },
        { name: "repository", role: "Inspect repository", status: "executed" },
      ],
    })

    const initialized = await Effect.runPromise(
      SystemContext.initialize(SystemContextOrchestration.load(sessionID)),
    )

    expect(initialized.baseline).toContain("Specialists still required: dependency")
    expect(initialized.baseline).toContain("Specialists already executed: repository")
    expect(initialized.baseline).toContain("dispatch each still-required specialist with the task tool")
  })
})
