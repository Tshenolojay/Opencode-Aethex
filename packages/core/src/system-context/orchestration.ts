export * as SystemContextOrchestration from "./orchestration"

import { Effect, Schema } from "effect"
import type { SessionSchema } from "../session/schema"
import { getExecutionPackage } from "../session/execution-package-store"
import { SystemContext } from "./index"

function render(sessionID: SessionSchema.ID): string | undefined {
  const pkg = getExecutionPackage(sessionID)
  if (!pkg) return undefined

  // High-confidence / bypassed work must remain transparent to the
  // underlying OpenCode prompt. Keep the result in ExecutionPackage for UI
  // visibility, but inject no Aethex system instructions unless orchestration
  // is actually required.
  if (!pkg.needsOrchestration) return undefined

  const specialists = pkg.specialists ?? []
  const normalizeAgent = (name: string) => {
    const id = name.startsWith("specialist/") ? name.slice("specialist/".length) : name
    return id.toLowerCase().replace(/\s+/g, "-")
  }
  const plannedAgents = specialists
    .filter((item) => item.status === undefined || item.status === "planned")
    .map((item) => normalizeAgent(item.name))
  const executedAgents = specialists
    .filter((item) => item.status === "executed" || item.status === "completed")
    .map((item) => normalizeAgent(item.name))

  return [
    "<orchestration>",
    "OpenCode Aethex orchestration is active for this prompt.",
    `Confidence: ${pkg.confidence ?? "unknown"}${pkg.confidenceScore !== undefined ? ` (${Math.round(Number(pkg.confidenceScore) * 100)}%)` : ""}`,
    `Status: ${pkg.status ?? "planned"}`,
    pkg.currentTask ? `Task: ${pkg.currentTask}` : undefined,
    plannedAgents.length ? `Specialists still required: ${plannedAgents.join(", ")}` : undefined,
    executedAgents.length ? `Specialists already executed: ${executedAgents.join(", ")}` : undefined,
    plannedAgents.length
      ? "Before completing the user request, dispatch each still-required specialist with the task tool using the exact subagent_type shown above. Use the current user task plus the specialist role as the task prompt. Consume the returned child-agent result before proceeding. Do not claim execution from a plan alone."
      : "Do not re-run specialists already marked executed unless new evidence makes another run necessary.",
    ...(pkg.activity ?? []).slice(-8).map((line) => `- ${line}`),
    "</orchestration>",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Builds orchestration context for exactly one Session.
 *
 * This must never read a process-global "latest package": multiple sessions can
 * share a Location, and using the latest package would leak orchestration state
 * between them.
 */
export function load(sessionID: SessionSchema.ID): SystemContext.SystemContext {
  const text = render(sessionID)
  if (!text) return SystemContext.empty

  return SystemContext.make({
    key: SystemContext.Key.make("core/orchestration"),
    codec: Schema.toCodecJson(Schema.String),
    load: Effect.succeed(text),
    baseline: (current) => current,
    update: (_previous, current) => current,
  })
}
