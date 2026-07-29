export * as SystemContextOrchestration from "./orchestration"

import { Effect, Layer, Schema } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { SystemContext } from "./index"
import { SystemContextRegistry } from "./registry"
import { latestExecutionPackage } from "../session/execution-package-store"

const orchestration = Layer.effectDiscard(
  Effect.gen(function* () {
    const registry = yield* SystemContextRegistry.Service

    const load = Effect.sync(() => {
      const pkg = latestExecutionPackage()
      if (!pkg) return undefined

      if (!pkg.needsOrchestration && pkg.status !== "orchestrating" && pkg.status !== "classifying") {
        if (pkg.status === "bypassed") {
          return [
            "<orchestration>",
            `Confidence: ${pkg.confidence ?? "high"} (specialists bypassed)`,
            pkg.currentTask ? `Task: ${pkg.currentTask}` : undefined,
            "</orchestration>",
          ]
            .filter(Boolean)
            .join("\n")
        }
        return undefined
      }

      const specialists = pkg.specialists ?? []
      const agentNames = specialists.map((item) => {
        const id = item.name.startsWith("specialist/") ? item.name.slice("specialist/".length) : item.name
        return id.toLowerCase().replace(/\s+/g, "-")
      })

      return [
        "<orchestration>",
        "OpenCode Aethex orchestration requires specialist agents for this prompt.",
        `Confidence: ${pkg.confidence ?? "unknown"}${pkg.confidenceScore !== undefined ? ` (${Math.round(Number(pkg.confidenceScore) * 100)}%)` : ""}`,
        `Status: ${pkg.status ?? "orchestrating"}`,
        pkg.currentTask ? `Task: ${pkg.currentTask}` : undefined,
        agentNames.length
          ? `Dispatch these specialists via the task tool (subagent_type): ${agentNames.join(", ")}`
          : "Dispatch relevant specialists via the task tool when needed.",
        "Do not solve hard multi-step work alone when specialists are listed — launch them, wait for results, then synthesize.",
        ...(pkg.activity ?? []).slice(0, 8).map((line) => `- ${line}`),
        "</orchestration>",
      ]
        .filter(Boolean)
        .join("\n")
    })

    const context = SystemContext.make({
      key: SystemContext.Key.make("core/orchestration"),
      codec: Schema.toCodecJson(Schema.String.pipe(Schema.optional)),
      load,
      baseline: (text) => text ?? "",
      update: (_previous, text) => text ?? "",
    })

    yield* registry.register({
      key: SystemContext.Key.make("core/orchestration"),
      load: Effect.succeed(context),
    })
  }),
)

export const node = makeLocationNode({
  name: "system-context-orchestration",
  layer: orchestration,
  deps: [SystemContextRegistry.node],
})
