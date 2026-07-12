export * as AgentSelectionAdvice from "./agent-selection-advice"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import { AgentCapabilities } from "./agent-capabilities"
import type { AgentType } from "./agent-context"
import type { Capability } from "../types/capability"

export interface AgentSelectionAdvice {
  readonly recommendedAgent: AgentType
  readonly alternativeAgents: readonly AgentType[]
  readonly selectionConfidence: number
  readonly selectionReason: string
  readonly capabilityMatch: readonly { agent: AgentType; score: number }[]
  readonly complexity: number
}

export interface Interface {
  readonly advise: (pkg: ExecutionPackage) => Effect.Effect<AgentSelectionAdvice>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentSelectionAdvice") {}

const advise: Interface["advise"] = Effect.fn("AgentSelectionAdvice.advise")(function* (pkg) {
  const capabilitiesService = yield* AgentCapabilities.Service

  const relevantCaps = pkg.capabilityPlan?.required ?? extractCapabilities(pkg)
  const mappings = yield* capabilitiesService.resolve(relevantCaps)

  const recommended = mappings[0]
  const alternatives = mappings.slice(1, 4).map((m) => m.agentType)

  const selectionConfidence = recommended?.coverageScore ?? 0.5
  const complexity = pkg.taskClassification.complexity

  const selectionReason = recommended
    ? `Agent ${recommended.agentType} covers ${(recommended.coverageScore * 100).toFixed(0)}% of required capabilities`
    : "No capability mapping found — falling back to general"

  return {
    recommendedAgent: recommended?.agentType ?? "general",
    alternativeAgents: alternatives,
    selectionConfidence,
    selectionReason,
    capabilityMatch: mappings.map((m) => ({ agent: m.agentType, score: m.coverageScore })),
    complexity,
  } as AgentSelectionAdvice
}) as Interface["advise"]

function extractCapabilities(pkg: ExecutionPackage): Capability[] {
  const caps: Capability[] = []
  if (pkg.taskClassification.requiresSearch) caps.push("search" as Capability)
  if (pkg.taskClassification.requiresContext) caps.push("long-context" as Capability)
  if (pkg.taskClassification.requiresDependencyGraph) caps.push("dependency-analysis" as Capability)
  if (pkg.taskClassification.requiresVerification) caps.push("verification" as Capability)
  return caps
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ advise })
  }),
)

export { layer }
