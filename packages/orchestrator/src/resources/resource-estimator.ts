export * as ResourceEstimator from "./resource-estimator"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { OrchestrationContext } from "../state/context"

export interface ResourceRequirements {
  readonly requiredCapabilities: readonly Capability[]
  readonly estimatedContextTokens: number
  readonly needsStreaming: boolean
  readonly needsReasoning: boolean
  readonly needsToolCalling: boolean
  readonly needsVision: boolean
  readonly complexityLevel: "low" | "medium" | "high" | "critical"
  readonly estimatedExecutionTimeMs: number
  readonly maxAcceptableLatencyMs: number
  readonly qualityFloor: number
}

export interface Interface {
  readonly estimate: (orchestrationContext: OrchestrationContext) => Effect.Effect<ResourceRequirements>
}

const make = Effect.gen(function* () {
  const estimate = (ctx: OrchestrationContext): Effect.Effect<ResourceRequirements> =>
    Effect.sync(() => {
      const classification = ctx.taskClassification
      const capabilities = ctx.selectedCapabilities ?? []
      const complexity = classification?.complexity ?? 0.5

      const complexityLevel: ResourceRequirements["complexityLevel"] =
        complexity >= 0.8 ? "critical" :
        complexity >= 0.6 ? "high" :
        complexity >= 0.3 ? "medium" : "low"

      const needsReasoning = capabilities.some((c) =>
        ["architecture-analysis", "planning", "reasoning"].includes(c),
      )
      const needsToolCalling = capabilities.some((c) =>
        ["code-generation", "tool-use"].includes(c),
      )

      return {
        requiredCapabilities: capabilities,
        estimatedContextTokens: 16_000,
        needsStreaming: true,
        needsReasoning,
        needsToolCalling,
        needsVision: false,
        complexityLevel,
        estimatedExecutionTimeMs: complexityLevel === "critical" ? 120_000 : complexityLevel === "high" ? 60_000 : 30_000,
        maxAcceptableLatencyMs: complexityLevel === "critical" ? 60_000 : 30_000,
        qualityFloor: complexityLevel === "critical" ? 0.8 : complexityLevel === "high" ? 0.6 : 0.4,
      }
    })

  return Service.of({ estimate })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ResourceEstimator") {}

const layer = Layer.effect(Service, make)
export { layer }
