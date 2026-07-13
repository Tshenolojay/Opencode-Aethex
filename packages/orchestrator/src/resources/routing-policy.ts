export * as RoutingPolicy from "./routing-policy"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { ResourceRequirements } from "./resource-estimator"
import type { ModelCapabilityFit } from "./capability-matcher"

export type RoutingStrategy =
  | "balanced"
  | "highest-quality"
  | "fastest"
  | "lowest-cost"
  | "free-only"
  | "reasoning-first"
  | "architecture-first"
  | "repository-first"
  | "coding-first"
  | "planning-first"
  | "documentation-first"
  | "latency-optimized"
  | "offline-preferred"
  | "user-preferred"

export interface PolicyContext {
  readonly strategy: RoutingStrategy
  readonly requirements: ResourceRequirements
  readonly fits: readonly ModelCapabilityFit[]
  readonly healthScores: ReadonlyMap<string, number>
  readonly userPreferredProviders: readonly string[]
  readonly userPreferredModels: readonly string[]
  readonly excludedProviders: readonly string[]
  readonly excludedModels: readonly string[]
}

export interface PolicyResult {
  readonly strategy: RoutingStrategy
  readonly scoredCandidates: readonly ScoredCandidate[]
  readonly reasoning: string
}

export interface ScoredCandidate {
  readonly providerID: string
  readonly modelID: string
  readonly fitScore: number
  readonly qualityScore: number
  readonly costScore: number
  readonly latencyScore: number
  readonly healthScore: number
  readonly preferenceScore: number
  readonly totalScore: number
  readonly reasoning: string[]
}

export interface Interface {
  readonly score: (policyContext: PolicyContext) => Effect.Effect<PolicyResult>
  readonly getDefaultStrategy: (requirements: ResourceRequirements) => Effect.Effect<RoutingStrategy>
  readonly getCapabilityStrategy: (capability: Capability) => Effect.Effect<RoutingStrategy>
}

function computeCostScore(costPerToken: number): number {
  if (costPerToken <= 0) return 1
  if (costPerToken < 0.000001) return 0.9
  if (costPerToken < 0.00001) return 0.7
  if (costPerToken < 0.0001) return 0.5
  return 0.3
}

function computeLatencyScore(averageLatencyMs: number): number {
  if (averageLatencyMs <= 0) return 1
  if (averageLatencyMs < 1000) return 1
  if (averageLatencyMs < 3000) return 0.8
  if (averageLatencyMs < 10_000) return 0.6
  if (averageLatencyMs < 30_000) return 0.4
  return 0.2
}

const CAPABILITY_STRATEGY_MAP: Partial<Record<Capability, RoutingStrategy>> = {
  "architecture-analysis": "architecture-first",
  "planning": "planning-first",
  "reasoning": "reasoning-first",
  "code-generation": "coding-first",
  "documentation-analysis": "documentation-first",
  "repository-understanding": "repository-first",
}

const make = Effect.gen(function* () {
  const score = (ctx: PolicyContext): Effect.Effect<PolicyResult> =>
    Effect.sync(() => {
      const { strategy, fits, healthScores, userPreferredProviders, userPreferredModels, excludedProviders, excludedModels } = ctx

      const excludedProviderSet = new Set(excludedProviders)
      const excludedModelSet = new Set(excludedModels)
      const preferredProviderSet = new Set(userPreferredProviders)
      const preferredModelSet = new Set(userPreferredModels)

      const scored: ScoredCandidate[] = fits
        .filter((f) => !excludedProviderSet.has(f.providerID) && !excludedModelSet.has(f.modelID))
        .map((f) => {
          const health = healthScores.get(f.providerID) ?? 1
          const preferenceBonus =
            (preferredProviderSet.has(f.providerID) ? 0.1 : 0) +
            (preferredModelSet.has(f.modelID) ? 0.1 : 0)
          const reasoning: string[] = []

          let qualityWeight = 0.3
          let costWeight = 0.3
          let latencyWeight = 0.2
          let healthWeight = 0.1
          let preferenceWeight = 0.1

          switch (strategy) {
            case "highest-quality":
              qualityWeight = 0.6; costWeight = 0.1; latencyWeight = 0.1; healthWeight = 0.1; preferenceWeight = 0.1
              reasoning.push("Prioritizing quality")
              break
            case "fastest":
              latencyWeight = 0.5; qualityWeight = 0.2; costWeight = 0.1; healthWeight = 0.1; preferenceWeight = 0.1
              reasoning.push("Prioritizing latency")
              break
            case "lowest-cost":
              costWeight = 0.6; qualityWeight = 0.2; latencyWeight = 0.1; healthWeight = 0.05; preferenceWeight = 0.05
              reasoning.push("Prioritizing cost efficiency")
              break
            case "free-only":
              costWeight = 0.8; qualityWeight = 0.1; latencyWeight = 0.05; healthWeight = 0.05; preferenceWeight = 0
              reasoning.push("Free tier only")
              break
            case "reasoning-first":
            case "architecture-first":
            case "repository-first":
            case "coding-first":
            case "planning-first":
            case "documentation-first":
              qualityWeight = 0.5; latencyWeight = 0.2; costWeight = 0.1; healthWeight = 0.1; preferenceWeight = 0.1
              reasoning.push(`${strategy} strategy — quality-focused`)
              break
            case "latency-optimized":
              latencyWeight = 0.4; healthWeight = 0.2; qualityWeight = 0.2; costWeight = 0.1; preferenceWeight = 0.1
              reasoning.push("Latency-optimized routing")
              break
            default:
              reasoning.push("Balanced routing")
          }

          const qualityScore = f.fitScore
          const costScore = computeCostScore(0)
          const latencyScore = computeLatencyScore(0)

          const totalScore =
            qualityScore * qualityWeight +
            costScore * costWeight +
            latencyScore * latencyWeight +
            health * healthWeight +
            preferenceBonus * preferenceWeight

          if (f.meetsAllRequirements) reasoning.push("Meets all requirements")
          if (preferredProviderSet.has(f.providerID)) reasoning.push("User-preferred provider")
          if (preferredModelSet.has(f.modelID)) reasoning.push("User-preferred model")

          return {
            providerID: f.providerID,
            modelID: f.modelID,
            fitScore: f.fitScore,
            qualityScore,
            costScore,
            latencyScore,
            healthScore: health,
            preferenceScore: preferenceBonus,
            totalScore,
            reasoning,
          }
        })
        .sort((a, b) => b.totalScore - a.totalScore)

      return {
        strategy,
        scoredCandidates: scored,
        reasoning: `Applied ${strategy} strategy across ${scored.length} candidates`,
      }
    })

  const getDefaultStrategy = (requirements: ResourceRequirements): Effect.Effect<RoutingStrategy> =>
    Effect.sync(() => {
      if (requirements.complexityLevel === "critical") return "highest-quality"
      if (requirements.needsReasoning) return "reasoning-first"
      return "balanced"
    })

  const getCapabilityStrategy = (capability: Capability): Effect.Effect<RoutingStrategy> =>
    Effect.succeed(CAPABILITY_STRATEGY_MAP[capability] ?? "balanced")

  return Service.of({ score, getDefaultStrategy, getCapabilityStrategy })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RoutingPolicy") {}

const layer = Layer.effect(Service, make)
export { layer }
