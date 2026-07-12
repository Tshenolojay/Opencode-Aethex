export * as ExecutionStrategy from "./execution-strategy"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"

export type ExecutionStrategyType =
  | "sequential"
  | "parallel"
  | "hybrid"
  | "verification-first"
  | "reasoning-first"
  | "context-first"
  | "cost-optimized"
  | "latency-optimized"
  | "balanced"
  | "pipeline"
  | "review-pipeline"
  | "consensus-pipeline"
  | "verification-pipeline"
  | "planning-pipeline"

export interface ExecutionStrategyProfile {
  readonly type: ExecutionStrategyType
  readonly name: string
  readonly description: string
  readonly allowsParallelExecution: boolean
  readonly allowsSequentialExecution: boolean
  readonly priorityOnQuality: boolean
  readonly priorityOnSpeed: boolean
  readonly priorityOnCost: boolean
  readonly recommendedFor: readonly string[]
}

export const STRATEGIES: Record<ExecutionStrategyType, ExecutionStrategyProfile> = {
  sequential: {
    type: "sequential", name: "Sequential", description: "Execute specialists one at a time in order",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: false, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["dependency-investigation", "refactoring", "architecture-design"],
  },
  parallel: {
    type: "parallel", name: "Parallel", description: "Execute independent specialists concurrently",
    allowsParallelExecution: true, allowsSequentialExecution: false,
    priorityOnQuality: false, priorityOnSpeed: true, priorityOnCost: false,
    recommendedFor: ["repository-search", "documentation", "general-chat"],
  },
  hybrid: {
    type: "hybrid", name: "Hybrid", description: "Mix of parallel and sequential execution",
    allowsParallelExecution: true, allowsSequentialExecution: true,
    priorityOnQuality: false, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["bug-fix", "debugging", "code-generation"],
  },
  "verification-first": {
    type: "verification-first", name: "Verification First", description: "Prioritize verification specialist",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["testing", "security-review"],
  },
  "reasoning-first": {
    type: "reasoning-first", name: "Reasoning First", description: "Prioritize reasoning capabilities",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["bug-fix", "debugging", "performance-optimisation"],
  },
  "context-first": {
    type: "context-first", name: "Context First", description: "Prioritize context window size",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: false, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["documentation", "architecture-design"],
  },
  "cost-optimized": {
    type: "cost-optimized", name: "Cost Optimized", description: "Minimize token cost",
    allowsParallelExecution: true, allowsSequentialExecution: true,
    priorityOnQuality: false, priorityOnSpeed: false, priorityOnCost: true,
    recommendedFor: ["general-chat", "repository-search"],
  },
  "latency-optimized": {
    type: "latency-optimized", name: "Latency Optimized", description: "Minimize response latency",
    allowsParallelExecution: true, allowsSequentialExecution: false,
    priorityOnQuality: false, priorityOnSpeed: true, priorityOnCost: false,
    recommendedFor: ["general-chat", "fast-response"],
  },
  balanced: {
    type: "balanced", name: "Balanced", description: "Balance quality, speed, and cost",
    allowsParallelExecution: true, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: true, priorityOnCost: false,
    recommendedFor: [],
  },
  "pipeline": {
    type: "pipeline", name: "Pipeline", description: "Run specialists through a shared advisory pipeline",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: [],
  },
  "review-pipeline": {
    type: "review-pipeline", name: "Review Pipeline", description: "Specialists produce findings then peer-review one another",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["code-generation", "refactoring", "bug-fix"],
  },
  "consensus-pipeline": {
    type: "consensus-pipeline", name: "Consensus Pipeline", description: "Specialists collaborate then build a unified recommendation",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["architecture-design", "planning", "debugging"],
  },
  "verification-pipeline": {
    type: "verification-pipeline", name: "Verification Pipeline", description: "Emphasize verification specialist sign-off",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["testing", "security-review"],
  },
  "planning-pipeline": {
    type: "planning-pipeline", name: "Planning Pipeline", description: "Specialists collaborate on a coordinated plan",
    allowsParallelExecution: false, allowsSequentialExecution: true,
    priorityOnQuality: true, priorityOnSpeed: false, priorityOnCost: false,
    recommendedFor: ["planning"],
  },
}

export interface ExecutionStrategyRecommendation {
  readonly strategy: ExecutionStrategyProfile
  readonly confidence: number
  readonly reasoning: string
}

export interface Interface {
  readonly recommendStrategy: (taskType: string, capabilities: readonly Capability[], complexity: number) => Effect.Effect<ExecutionStrategyRecommendation>
  readonly getStrategy: (type: ExecutionStrategyType) => ExecutionStrategyProfile | undefined
  readonly allStrategies: () => readonly ExecutionStrategyProfile[]
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionStrategy") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const recommendStrategy: Interface["recommendStrategy"] = Effect.fn("ExecutionStrategy.recommendStrategy")(function* (taskType, capabilities, complexity) {
      const byTaskType = Object.values(STRATEGIES).find((s) => s.recommendedFor.includes(taskType)) ?? STRATEGIES.balanced

      let strategy = byTaskType
      if (capabilities.includes("reasoning") && complexity > 0.7) {
        strategy = STRATEGIES["reasoning-first"]
      } else if (capabilities.includes("verification") || taskType === "testing") {
        strategy = STRATEGIES["verification-first"]
      } else if (complexity > 0.8) {
        strategy = STRATEGIES.hybrid
      }

      return {
        strategy,
        confidence: complexity > 0 ? Math.min(strategy.recommendedFor.includes(taskType) ? 0.8 : 0.6, 0.95) : 0.5,
        reasoning: `selected ${strategy.name} for ${taskType} (complexity: ${complexity})`,
      }
    })

    return Service.of({
      recommendStrategy,
      getStrategy: (type) => STRATEGIES[type],
      allStrategies: () => Object.values(STRATEGIES),
    })
  }),
)

export { layer }
