export * as ExecutionPackageBuilder from "./execution-package-builder"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import { empty as emptyPackage } from "./execution-package"
import type { AgentSelectionAdvice } from "./agent-selection-advice"
import type { AgentHints } from "./agent-hints"
import type { AgentContextProfile } from "./agent-context"
import type { PromptAugmentation } from "./prompt-augmentation"

export interface BuildInput {
  readonly sessionID: string
  readonly taskClassification: ExecutionPackage["taskClassification"]
  readonly classifications: ExecutionPackage["classifications"]
  readonly confidence: ExecutionPackage["confidence"]
  readonly confidenceScore: ExecutionPackage["confidenceScore"]
  readonly capabilityPlan: ExecutionPackage["capabilityPlan"]
  readonly specialistPlan: ExecutionPackage["specialistPlan"]
  readonly knowledgePlan: ExecutionPackage["knowledgePlan"]
  readonly dispatchPlan: ExecutionPackage["dispatchPlan"]
  readonly planningPolicy: ExecutionPackage["planningPolicy"]
  readonly executionGraph: ExecutionPackage["executionGraph"]
  readonly knowledgeBundle: ExecutionPackage["knowledgeBundle"]
  readonly repositoryIntelligence: ExecutionPackage["repositoryIntelligence"]
  readonly dependencyIntelligence: ExecutionPackage["dependencyIntelligence"]
  readonly architectureIntelligence: ExecutionPackage["architectureIntelligence"]
  readonly documentationIntelligence: ExecutionPackage["documentationIntelligence"]
  readonly verificationIntelligence: ExecutionPackage["verificationIntelligence"]
  readonly contextIntelligence: ExecutionPackage["contextIntelligence"]
  readonly runtimeMetrics: ExecutionPackage["runtimeMetrics"]
  readonly executionNotes: ExecutionPackage["executionNotes"]
}

export interface Interface {
  readonly build: (input: BuildInput) => Effect.Effect<ExecutionPackage>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionPackageBuilder") {}

const build: Interface["build"] = Effect.fn("ExecutionPackageBuilder.build")(function* (input) {
  const empty = emptyPackage(input.sessionID)
  return {
    ...empty,
    taskClassification: input.taskClassification,
    classifications: input.classifications,
    confidence: input.confidence,
    confidenceScore: input.confidenceScore,
    capabilityPlan: input.capabilityPlan,
    specialistPlan: input.specialistPlan,
    knowledgePlan: input.knowledgePlan,
    dispatchPlan: input.dispatchPlan,
    planningPolicy: input.planningPolicy,
    executionGraph: input.executionGraph,
    knowledgeBundle: input.knowledgeBundle,
    repositoryIntelligence: input.repositoryIntelligence,
    dependencyIntelligence: input.dependencyIntelligence,
    architectureIntelligence: input.architectureIntelligence,
    documentationIntelligence: input.documentationIntelligence,
    verificationIntelligence: input.verificationIntelligence,
    contextIntelligence: input.contextIntelligence,
    runtimeMetrics: input.runtimeMetrics,
    executionNotes: input.executionNotes,
    conversationSummary: input.knowledgeBundle.conversationSummary,
    modelRecommendation: input.capabilityPlan?.reason,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
