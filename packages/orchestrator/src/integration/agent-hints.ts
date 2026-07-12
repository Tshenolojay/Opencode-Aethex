export * as AgentHints from "./agent-hints"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import type { AgentType } from "./agent-context"

export type HintTag =
  | "repository-heavy"
  | "large-refactor"
  | "verification-required"
  | "architecture-sensitive"
  | "documentation-missing"
  | "dependency-risk"
  | "long-context"
  | "planning-intensive"
  | "execution-risk"
  | "missing-verification"
  | "tool-advice-available"
  | "context-compressed"
  | "specialist-consensus"

export interface AgentHints {
  readonly hints: readonly HintTag[]
  readonly reason: string | undefined
}

export interface Interface {
  readonly generate: (pkg: ExecutionPackage, agentType: AgentType) => Effect.Effect<AgentHints>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentHints") {}

const generate: Interface["generate"] = Effect.fn("AgentHints.generate")(function* (pkg, agentType) {
  const hints: HintTag[] = []

  const repoFiles = pkg.knowledgeBundle.relevantFiles.length
  if (repoFiles > 20) hints.push("repository-heavy")

  const depCount = pkg.knowledgeBundle.dependencyGraph.length
  if (depCount > 10) hints.push("dependency-risk")

  const archRisks = pkg.architectureIntelligence?.risks.length ?? 0
  if (archRisks > 0) hints.push("architecture-sensitive")

  const outdatedDocs = pkg.documentationIntelligence?.outdated.length ?? 0
  if (outdatedDocs > 3) hints.push("documentation-missing")

  const verConflicts = pkg.verificationIntelligence?.conflicts.length ?? 0
  if (verConflicts > 0) hints.push("verification-required")

  if (agentType === "plan" || agentType === "build") hints.push("planning-intensive")

  if ((pkg.knowledgeBundle.contextSummary?.length ?? 0) > 1000) hints.push("long-context")

  if (pkg.taskClassification.type === "refactoring" || pkg.taskClassification.type === "architecture-design") {
    hints.push("large-refactor")
  }

  const intel = pkg.executionIntelligence
  if (intel?.executionRisks && intel.executionRisks.length > 0) hints.push("execution-risk")
  if (pkg.taskClassification.requiresVerification && (intel?.executionConstraints?.some((c) => c.type === "hard") ?? false)) {
    hints.push("missing-verification")
  }
  if (intel?.toolAdvice && intel.toolAdvice.suggestedTools.length > 0) hints.push("tool-advice-available")
  if (pkg.compressedContext) hints.push("context-compressed")
  if (pkg.specialistConsensus) hints.push("specialist-consensus")

  const reason = hints.length > 0
    ? `Detected: ${hints.join(", ")}`
    : undefined

  return { hints, reason }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ generate })
  }),
)

export { layer }
