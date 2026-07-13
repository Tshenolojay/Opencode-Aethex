export * as ModelSelector from "./selector"

import { Context, Effect, Layer } from "effect"
import type { Capability, CapabilityProfile, CapabilityRequirement } from "../types/capability"
import type { TaskType } from "../types/classification"
import type { RankedModel } from "../model/model-ranking"
import type { SelectionPolicy } from "../model/selection-policies"
import { SelectionPolicies } from "../model/selection-policies"
import { CapabilityRegistry } from "../model/capability-registry"
import { SelectionEngine } from "../resources/selection-engine"
import type { ModelSelection as ResourceSelection } from "../resources/selection-engine"

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

const estimateCapabilities: Interface["estimateCapabilities"] = Effect.fn("ModelSelector.estimateCapabilities")(function* (input) {
  const capRegistry = yield* CapabilityRegistry.Service
  const requirements = taskTypeToCapabilities(input.taskType, input.complexity)

  let reason: string
  switch (input.taskType) {
    case "bug-fix": reason = "Bug fixing requires strong reasoning and code analysis"; break
    case "debugging": reason = "Debugging requires analytical reasoning and search"; break
    case "code-generation": reason = "Code generation requires code-capable model"; break
    case "architecture-design": reason = "Architecture design requires planning and reasoning"; break
    case "repository-search": reason = "Repository search requires search and code understanding"; break
    case "testing": reason = "Testing requires code generation and analysis"; break
    case "refactoring": reason = "Refactoring requires code analysis and reasoning"; break
    case "performance-optimisation": reason = "Performance requires deep analysis and reasoning"; break
    case "security-review": reason = "Security review requires analysis and reasoning"; break
    case "dependency-investigation": reason = "Dependency investigation requires search and analysis"; break
    case "documentation": reason = "Documentation benefits from analysis capability"; break
    default: reason = "General task with minimal capability requirements"; break
  }

  return { requirements, recommendedCount: requirements.filter((r) => !r.optional).length, reason } as CapabilityProfile
}) as unknown as Interface["estimateCapabilities"]

const toModelSelection = (sel: ResourceSelection | undefined): ModelSelection | undefined => {
  if (!sel) return undefined
  return {
    providerID: sel.providerID,
    modelID: sel.modelID,
    capabilities: sel.requirements.requiredCapabilities as Capability[],
    reason: sel.reasoning.join("; "),
    matchScore: sel.confidence,
  }
}

const select: Interface["select"] = Effect.fn("ModelSelector.select")(function* (input) {
  if (input.requiredCapabilities.length === 0) {
    if (input.availableModels.length === 0) return undefined
    const first = input.availableModels[0]
    return {
      providerID: first.providerID,
      modelID: first.modelID,
      capabilities: first.capabilities,
      reason: "delegated to SelectionEngine (no specific capabilities required)",
      matchScore: 1,
    }
  }

  const engine = yield* SelectionEngine.Service
  const selection = yield* engine.selectForTask(input.requiredCapabilities)
  if (!selection) return undefined
  return {
    providerID: selection.providerID,
    modelID: selection.modelID,
    capabilities: input.requiredCapabilities,
    reason: selection.reasoning.join("; "),
    matchScore: selection.confidence,
  }
}) as unknown as Interface["select"]

const evaluate: Interface["evaluate"] = Effect.fn("ModelSelector.evaluate")(function* (input) {
  const selection = yield* select(input)
  const candidates: ScoredCandidate[] = input.availableModels.map((m) => {
    const matched = m.capabilities.filter((c) => input.requiredCapabilities.includes(c))
    const missing = input.requiredCapabilities.filter((c) => !m.capabilities.includes(c))
    return {
      providerID: m.providerID,
      modelID: m.modelID,
      capabilities: m.capabilities,
      matchScore: input.requiredCapabilities.length > 0 ? matched.length / input.requiredCapabilities.length : 1,
      matchedCapabilities: matched,
      missingCapabilities: missing,
    }
  }).sort((a, b) => b.matchScore - a.matchScore)

  return { selection, candidates }
})

const selectWithFallback: Interface["selectWithFallback"] = Effect.fn("ModelSelector.selectWithFallback")(function* (input: Input, policyName: string | undefined) {
  const policies = yield* SelectionPolicies.Service
  const policy = (policyName ? policies.getPolicy(policyName) ?? SelectionPolicies.DEFAULT_POLICY : SelectionPolicies.DEFAULT_POLICY) as SelectionPolicy
  const engine = yield* SelectionEngine.Service
  const selection = yield* engine.selectForTask(input.requiredCapabilities, policy.modelStrategy as never)
  if (!selection) return undefined
  const chain = selection.fallbackChain

  const secondary = chain.secondary
    ? [{
        providerID: chain.secondary.providerID,
        modelID: chain.secondary.modelID,
        capabilities: input.requiredCapabilities,
        reason: chain.reasoning,
        matchScore: chain.secondary.totalScore,
      }]
    : []
  const fallback = chain.tertiary
    ? {
        providerID: chain.tertiary.providerID,
        modelID: chain.tertiary.modelID,
        capabilities: input.requiredCapabilities,
        reason: chain.reasoning,
        matchScore: chain.tertiary.totalScore,
      }
    : undefined

  return {
    primary: toModelSelection(selection),
    secondary,
    fallback,
    emergencyFallback: undefined,
    equivalents: [],
    policy: policy.name,
    strategy: policy.modelStrategy,
  } as RichSelection
}) as unknown as Interface["selectWithFallback"]

const selectWeighted: Interface["selectWeighted"] = Effect.fn("ModelSelector.selectWeighted")(function* (input: Input, _options: { readonly healthWeight?: number; readonly costWeight?: number; readonly latencyWeight?: number; readonly capabilityWeight?: number } = {}) {
  const engine = yield* SelectionEngine.Service
  const selection = yield* engine.selectForTask(input.requiredCapabilities)
  if (!selection) return undefined
  return {
    providerID: selection.providerID,
    modelID: selection.modelID,
    capabilities: input.requiredCapabilities,
    reason: selection.reasoning.join("; "),
    matchScore: selection.confidence,
  }
}) as unknown as Interface["selectWeighted"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ select, evaluate, estimateCapabilities, selectWithFallback, selectWeighted })
  }),
)

export { layer }
