export * as ModelSelector from "./selector"

import { Context, Effect, Layer } from "effect"
import type { Capability, CapabilityProfile, CapabilityRequirement } from "../types/capability"
import type { TaskType } from "../types/classification"
import { ModelRanking } from "../model/model-ranking"
import { SelectionPolicies } from "../model/selection-policies"
import { CapabilityRegistry } from "../model/capability-registry"
import type { RankedModel } from "../model/model-ranking"
import type { SelectionPolicy } from "../model/selection-policies"
import { ModelHealth } from "../model/model-health"
import { CostEstimator } from "../model/cost-estimator"
import { LatencyEstimator } from "../model/latency-estimator"
import { FallbackStrategy } from "../model/fallback-strategy"
import { ExecutionStrategy } from "../model/execution-strategy"

export interface ModelSelection {
  readonly providerID: string
  readonly modelID: string
  readonly capabilities: Capability[]
  readonly reason: string
  readonly matchScore: number | undefined
}

export interface ModelEvaluation {
  readonly selection: ModelSelection | undefined
  readonly candidates: readonly ScoredCandidate[]
}

export interface ScoredCandidate {
  readonly providerID: string
  readonly modelID: string
  readonly capabilities: Capability[]
  readonly matchScore: number
  readonly matchedCapabilities: Capability[]
  readonly missingCapabilities: Capability[]
}

export interface Input {
  readonly requiredCapabilities: Capability[]
  readonly availableModels: readonly AvailableModel[]
}

export interface AvailableModel {
  readonly providerID: string
  readonly modelID: string
  readonly capabilities: Capability[]
  readonly priority: number
}

export interface RichSelection {
  readonly primary: ModelSelection | undefined
  readonly secondary: readonly ModelSelection[]
  readonly fallback: ModelSelection | undefined
  readonly emergencyFallback: ModelSelection | undefined
  readonly equivalents: readonly ModelSelection[]
  readonly policy: string
  readonly strategy: string
}

export interface Interface {
  readonly select: (input: Input) => Effect.Effect<ModelSelection | undefined>
  readonly evaluate: (input: Input) => Effect.Effect<ModelEvaluation>
  readonly estimateCapabilities: (input: {
    readonly taskType: TaskType
    readonly complexity: number
    readonly requiresSearch: boolean
    readonly requiresContext: boolean
    readonly requiresDependencyGraph: boolean
    readonly requiresVerification: boolean
  }) => Effect.Effect<CapabilityProfile>
  readonly selectWithFallback: (input: Input, policyName?: string) => Effect.Effect<RichSelection>
  readonly selectWeighted: (input: Input, options?: {
    readonly healthWeight?: number
    readonly costWeight?: number
    readonly latencyWeight?: number
    readonly capabilityWeight?: number
  }) => Effect.Effect<ModelSelection | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelSelector") {}

function taskTypeToCapabilities(taskType: TaskType, complexity: number): CapabilityRequirement[] {
  const base: CapabilityRequirement[] = [
    { capability: "tool-use", weight: 1.0, optional: false },
    { capability: "code-generation", weight: 0.8, optional: false },
  ]

  switch (taskType) {
    case "bug-fix":
      base.push({ capability: "reasoning", weight: 1.0, optional: false })
      base.push({ capability: "analysis", weight: 0.9, optional: false })
      base.push({ capability: "search", weight: 0.6, optional: true })
      break
    case "debugging":
      base.push({ capability: "reasoning", weight: 1.0, optional: false })
      base.push({ capability: "analysis", weight: 0.9, optional: false })
      base.push({ capability: "search", weight: 0.5, optional: true })
      break
    case "code-generation":
      base.push({ capability: "code-generation", weight: 1.0, optional: false })
      break
    case "architecture-design":
      base.push({ capability: "reasoning", weight: 1.0, optional: false })
      base.push({ capability: "planning", weight: 1.0, optional: false })
      base.push({ capability: "analysis", weight: 0.8, optional: false })
      break
    case "repository-search":
      base.push({ capability: "search", weight: 1.0, optional: false })
      base.push({ capability: "repository-understanding", weight: 0.9, optional: false })
      break
    case "testing":
      base.push({ capability: "code-generation", weight: 0.8, optional: false })
      base.push({ capability: "analysis", weight: 0.7, optional: true })
      break
    case "refactoring":
      base.push({ capability: "analysis", weight: 0.9, optional: false })
      base.push({ capability: "reasoning", weight: 0.8, optional: false })
      base.push({ capability: "repository-understanding", weight: 0.7, optional: true })
      break
    case "performance-optimisation":
      base.push({ capability: "analysis", weight: 1.0, optional: false })
      base.push({ capability: "reasoning", weight: 0.9, optional: false })
      base.push({ capability: "search", weight: 0.6, optional: true })
      break
    case "security-review":
      base.push({ capability: "analysis", weight: 1.0, optional: false })
      base.push({ capability: "reasoning", weight: 1.0, optional: false })
      base.push({ capability: "search", weight: 0.7, optional: true })
      break
    case "dependency-investigation":
      base.push({ capability: "search", weight: 0.9, optional: false })
      base.push({ capability: "analysis", weight: 0.7, optional: true })
      break
    case "general-chat":
      return [{ capability: "tool-use", weight: 1.0, optional: false }]
    case "documentation":
      base.push({ capability: "analysis", weight: 0.5, optional: true })
      break
  }

  return base
}

function scoreModel(
  model: AvailableModel,
  requirements: readonly CapabilityRequirement[],
): { matched: Capability[]; missing: Capability[]; score: number } {
  const matched: Capability[] = []
  const missing: Capability[] = []
  let totalScore = 0
  let totalWeight = 0

  for (const req of requirements) {
    if (model.capabilities.includes(req.capability)) {
      matched.push(req.capability)
      totalScore += req.weight * (req.optional ? 0.5 : 1.0)
    } else {
      missing.push(req.capability)
    }
    totalWeight += req.weight
  }

  const matchScore = totalWeight > 0 ? totalScore / totalWeight : 0
  return { matched, missing, score: matchScore }
}

const estimateCapabilities: Interface["estimateCapabilities"] = Effect.fn("ModelSelector.estimateCapabilities")(function* (input) {
  const capRegistry = yield* CapabilityRegistry.Service
  const requirements = taskTypeToCapabilities(input.taskType, input.complexity)

  let reason: string
  switch (input.taskType) {
    case "bug-fix": reason = "Bug fixing requires strong reasoning and code analysis" ; break
    case "debugging": reason = "Debugging requires analytical reasoning and search" ; break
    case "code-generation": reason = "Code generation requires code-capable model" ; break
    case "architecture-design": reason = "Architecture design requires planning and reasoning" ; break
    case "repository-search": reason = "Repository search requires search and code understanding" ; break
    case "testing": reason = "Testing requires code generation and analysis" ; break
    case "refactoring": reason = "Refactoring requires code analysis and reasoning" ; break
    case "performance-optimisation": reason = "Performance requires deep analysis and reasoning" ; break
    case "security-review": reason = "Security review requires analysis and reasoning" ; break
    case "dependency-investigation": reason = "Dependency investigation requires search and analysis" ; break
    case "documentation": reason = "Documentation benefits from analysis capability" ; break
    default: reason = "General task with minimal capability requirements" ; break
  }

  return { requirements, recommendedCount: requirements.filter((r) => !r.optional).length, reason }
})

const select: Interface["select"] = Effect.fn("ModelSelector.select")(function* (input) {
  const { requiredCapabilities, availableModels } = input

  if (requiredCapabilities.length === 0) {
    if (availableModels.length === 0) return undefined
    return {
      providerID: availableModels[0].providerID,
      modelID: availableModels[0].modelID,
      capabilities: availableModels[0].capabilities,
      reason: "no specific capabilities required; using first available",
      matchScore: 1,
    }
  }

  const requirements: CapabilityRequirement[] = requiredCapabilities.map((c) => ({
    capability: c, weight: 1, optional: false,
  }))

  const candidates = availableModels
    .map((m) => ({ model: m, ...scoreModel(m, requirements) }))
    .sort((a, b) => b.score - a.score || b.model.priority - a.model.priority)

  if (candidates.length === 0) return undefined

  const best = candidates[0].score > 0 ? candidates[0] : undefined
  if (!best) return undefined

  return {
    providerID: best.model.providerID,
    modelID: best.model.modelID,
    capabilities: best.model.capabilities,
    reason: best.matched.length === requirements.length
      ? "full capability match"
      : `partial match (${best.matched.length}/${requirements.length})`,
    matchScore: best.score,
  }
})

const evaluate: Interface["evaluate"] = Effect.fn("ModelSelector.evaluate")(function* (input) {
  const requirements: CapabilityRequirement[] = input.requiredCapabilities.map((c) => ({
    capability: c, weight: 1, optional: false,
  }))

  const scoredCandidates: ScoredCandidate[] = input.availableModels.map((m) => {
    const { matched, missing, score } = scoreModel(m, requirements)
    return {
      providerID: m.providerID,
      modelID: m.modelID,
      capabilities: m.capabilities,
      matchScore: score,
      matchedCapabilities: matched,
      missingCapabilities: missing,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)

  const selection = scoredCandidates.length > 0 && scoredCandidates[0].matchScore > 0
    ? {
        providerID: scoredCandidates[0].providerID,
        modelID: scoredCandidates[0].modelID,
        capabilities: scoredCandidates[0].capabilities,
        reason: scoredCandidates[0].missingCapabilities.length === 0
          ? "full capability match"
          : `best partial match (${scoredCandidates[0].matchedCapabilities.length}/${requirements.length})`,
        matchScore: scoredCandidates[0].matchScore,
      }
    : undefined

  return { selection, candidates: scoredCandidates }
})

const selectWithFallback: Interface["selectWithFallback"] = Effect.fn("ModelSelector.selectWithFallback")(function* (input, policyName) {
  const modelRanking = yield* ModelRanking.Service
  const policies = yield* SelectionPolicies.Service

  const policy = policyName ? policies.getPolicy(policyName) ?? SelectionPolicies.DEFAULT_POLICY : SelectionPolicies.DEFAULT_POLICY
  const requirements: CapabilityRequirement[] = input.requiredCapabilities.map((c) => ({
    capability: c, weight: 1, optional: false,
  }))

  const { adjustedRequirements } = policies.applyPolicy(requirements, policy)
  const result = yield* modelRanking.rank(adjustedRequirements, policy.modelStrategy)

  const toSelection = (r: RankedModel | undefined): ModelSelection | undefined => {
    if (!r) return undefined
    return {
      providerID: r.model.providerID,
      modelID: r.model.modelID,
      capabilities: r.model.capabilities,
      reason: r.reasoning.join("; "),
      matchScore: r.rankScore,
    }
  }

  return {
    primary: toSelection(result.primary),
    secondary: result.secondary.map(toSelection).filter((s): s is ModelSelection => s !== undefined),
    fallback: toSelection(result.fallback),
    emergencyFallback: toSelection(result.emergencyFallback),
    equivalents: result.equivalents.map(toSelection).filter((s): s is ModelSelection => s !== undefined),
    policy: policy.name,
    strategy: policy.modelStrategy,
  }
})

const selectWeighted: Interface["selectWeighted"] = Effect.fn("ModelSelector.selectWeighted")(function* (input, options = {}) {
  const {
    healthWeight = 0.2,
    costWeight = 0.15,
    latencyWeight = 0.15,
    capabilityWeight = 0.5,
  } = options

  const modelHealth = yield* ModelHealth.Service
  const costEstimator = yield* CostEstimator.Service
  const latencyEstimator = yield* LatencyEstimator.Service

  const requirements: CapabilityRequirement[] = input.requiredCapabilities.map((c) => ({
    capability: c, weight: 1, optional: false,
  }))

  const scored = yield* Effect.all(input.availableModels.map((m) =>
    Effect.gen(function* () {
      const { matched, missing, score: capScore } = scoreModel(m, requirements)
      const health = yield* modelHealth.getHealth(m.providerID, m.modelID)
      const healthScore = health?.healthScore ?? 1
      const cost = yield* costEstimator.estimateCost(m.providerID, m.modelID, 1000, 500)
      const costScore = cost ? Math.max(0, 1 - cost.estimatedTotalCost / 0.1) : 0.5
      const latency = yield* latencyEstimator.estimateLatency(m.providerID, m.modelID)
      const latencyScore = latency ? Math.max(0, 1 - latency.estimatedTotalLatencyMs / 10000) : 0.5

      const totalScore = (capScore * capabilityWeight) + (healthScore * healthWeight) + (costScore * costWeight) + (latencyScore * latencyWeight)
      return { ...m, totalScore, capScore, healthScore, costScore, latencyScore, matched, missing }
    }),
  ))

  const best = scored.sort((a, b) => b.totalScore - a.totalScore)[0]
  if (!best || best.totalScore <= 0) return undefined

  return {
    providerID: best.providerID,
    modelID: best.modelID,
    capabilities: best.capabilities,
    reason: `weighted selection (cap=${(best.capScore * capabilityWeight).toFixed(2)}, health=${(best.healthScore * healthWeight).toFixed(2)}, cost=${(best.costScore * costWeight).toFixed(2)}, latency=${(best.latencyScore * latencyWeight).toFixed(2)})`,
    matchScore: best.totalScore,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ select, evaluate, estimateCapabilities, selectWithFallback, selectWeighted })
  }),
)

export { layer }
