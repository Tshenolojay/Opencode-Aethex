export * as DecisionEngine from "./decision-engine"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage, ReasoningDecisionSummary, DecisionRecord } from "../integration/execution-package"
import { ReasoningMemory } from "./reasoning-memory"

export interface Interface {
  readonly decide: (pkg: ExecutionPackage) => Effect.Effect<ReasoningDecisionSummary>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DecisionEngine") {}

const decide: Interface["decide"] = Effect.fn("DecisionEngine.decide")(function* (pkg) {
  const memory = yield* ReasoningMemory.Service
  const prior = yield* memory.hasPriorReasoning

  const reuseRepositoryReasoning: DecisionRecord = {
    decision: prior,
    reason: prior ? "Prior reasoning for this session is available for reuse" : "No prior reasoning stored yet",
    confidence: prior ? 0.8 : 0.5,
  }

  const showVerificationAdvice: DecisionRecord = {
    decision: pkg.taskClassification.requiresVerification || (pkg.executionIntelligence?.executionConstraints?.some((c) => c.type === "hard") ?? false),
    reason: "Verification is required or recommended for this task",
    confidence: 0.85,
  }

  const prioritizeArchitecture: DecisionRecord = {
    decision: (pkg.architectureIntelligence?.risks.length ?? 0) > 0,
    reason: (pkg.architectureIntelligence?.risks.length ?? 0) > 0 ? "Architecture risks detected" : "No architecture risks detected",
    confidence: 0.7,
  }

  const includeDependencyReasoning: DecisionRecord = {
    decision: pkg.taskClassification.requiresDependencyGraph || (pkg.dependencyIntelligence?.summary != null),
    reason: "Dependency analysis is relevant to this task",
    confidence: 0.7,
  }

  const runContextCompression: DecisionRecord = {
    decision: (pkg.knowledgeBundle.contextSummary?.length ?? 0) > 800 || pkg.confidence !== "high",
    reason: "Context is large or confidence is low — compress advisory context",
    confidence: 0.75,
  }

  const performPlanningReuse: DecisionRecord = {
    decision: prior,
    reason: prior ? "Reuse prior planning conclusions where task type matches" : "No prior planning to reuse",
    confidence: prior ? 0.75 : 0.5,
  }

  return {
    reuseRepositoryReasoning,
    showVerificationAdvice,
    prioritizeArchitecture,
    includeDependencyReasoning,
    runContextCompression,
    performPlanningReuse,
  } as ReasoningDecisionSummary
}) as Interface["decide"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ decide })
  }),
)

export { layer }
