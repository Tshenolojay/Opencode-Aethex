export * as ModelAssignment from "./model-assignment"

import { Context, Effect, Layer } from "effect"
import { ModelSelector } from "../selector/selector"
import { ModelRanking } from "../model/model-ranking"
import { SelectionPolicies } from "../model/selection-policies"
import { CapabilityRegistry } from "../model/capability-registry"
import type { Capability } from "../types/capability"
import type { ModelCandidate } from "./specialist-result"
import type { SelectionPolicy } from "../model/selection-policies"

export interface AssignmentResult {
  readonly primary: ModelCandidate | undefined
  readonly backup: ModelCandidate | undefined
  readonly selectionConfidence: number
  readonly fallback: ModelCandidate | undefined
  readonly policyUsed: string
  readonly strategyUsed: string
}

export interface AssignmentInput {
  readonly specialistCapabilities: readonly string[]
  readonly taskComplexity: number
  readonly policyName?: string
}

export interface Interface {
  readonly assign: (input: AssignmentInput) => Effect.Effect<AssignmentResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelAssignment") {}

const assign: Interface["assign"] = Effect.fn("ModelAssignment.assign")(function* (input) {
  const selector = yield* ModelSelector.Service
  const modelRanking = yield* ModelRanking.Service
  const policies = yield* SelectionPolicies.Service
  const capRegistry = yield* CapabilityRegistry.Service

  const required = input.specialistCapabilities.filter((c: string) => true) as Capability[]

  const policy = input.policyName
    ? policies.getPolicy(input.policyName) ?? SelectionPolicies.DEFAULT_POLICY
    : policies.selectPolicy({
        taskComplexity: input.taskComplexity,
        requiresStreaming: required.includes("streaming"),
        requiresVision: false,
        requiresCheapExecution: false,
        requiresHighQuality: required.includes("reasoning") || required.includes("planning"),
        requiresFastResponse: required.includes("fast-response"),
        capabilityCount: required.length,
      })

  const rankingResult = yield* modelRanking.rankSimple(required, policy.modelStrategy)

  const toCandidate = (r: typeof rankingResult.primary): ModelCandidate | undefined => {
    if (!r) return undefined
    return {
      providerID: r.model.providerID,
      modelID: r.model.modelID,
      matchScore: r.rankScore,
      matchedCapabilities: r.model.capabilities,
      missingCapabilities: required.filter((c) => !r.model.capabilities.includes(c)),
    }
  }

  const primary = toCandidate(rankingResult.primary)
  const backup = toCandidate(rankingResult.secondary[0])
  const fallback = toCandidate(rankingResult.fallback)

  const selectionConfidence = rankingResult.primary?.rankScore ?? 0

  return {
    primary,
    backup,
    fallback,
    selectionConfidence,
    policyUsed: policy.name,
    strategyUsed: policy.modelStrategy,
  }
}) as unknown as Interface["assign"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ assign })
  }),
)

export { layer }
