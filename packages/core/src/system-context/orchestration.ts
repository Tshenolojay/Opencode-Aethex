export * as SystemContextOrchestration from "./orchestration"

import { Effect, Schema } from "effect"
import type { SessionSchema } from "../session/schema"
import { getExecutionPackage } from "../session/execution-package-store"
import { SystemContext } from "./index"

function render(sessionID: SessionSchema.ID): string | undefined {
  const pkg = getExecutionPackage(sessionID)
  if (!pkg) return undefined

  if (!pkg.needsOrchestration && pkg.status !== "orchestrating" && pkg.status !== "classifying" && pkg.status !== "planned") {
    if (pkg.status !== "bypassed") return undefined
    return [
      "<orchestration>",
      `Confidence: ${pkg.confidence ?? "high"} (specialists bypassed)`,
      pkg.currentTask ? `Task: ${pkg.currentTask}` : undefined,
      "</orchestration>",
    ]
      .filter(Boolean)
      .join("\n")
  }

  const specialists = pkg.specialists ?? []
  const agentNames = specialists.map((item) => {
    const id = item.name.startsWith("specialist/") ? item.name.slice("specialist/".length) : item.name
    return id.toLowerCase().replace(/\s+/g, "-")
  })

  return [
    "<orchestration>",
    "OpenCode Aethex orchestration has planned specialist agents for this prompt.",
    `Confidence: ${pkg.confidence ?? "unknown"}${pkg.confidenceScore !== undefined ? ` (${Math.round(Number(pkg.confidenceScore) * 100)}%)` : ""}`,
    `Status: ${pkg.status ?? "planned"}`,
    pkg.currentTask ? `Task: ${pkg.currentTask}` : undefined,
    agentNames.length ? `Planned specialists: ${agentNames.join(", ")}` : undefined,
    "Use specialist agents only when a task/subagent execution tool is actually available in this runtime. Do not claim a specialist executed unless a child-agent result exists.",
    ...(pkg.activity ?? []).slice(0, 8).map((line) => `- ${line}`),
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
