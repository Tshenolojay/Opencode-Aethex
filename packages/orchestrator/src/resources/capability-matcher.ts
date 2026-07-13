export * as CapabilityMatcher from "./capability-matcher"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { ResourceRequirements } from "./resource-estimator"

export interface ModelCapabilityFit {
  readonly providerID: string
  readonly modelID: string
  readonly matchedCapabilities: readonly Capability[]
  readonly missingCapabilities: readonly Capability[]
  readonly fitScore: number
  readonly meetsAllRequirements: boolean
}

export interface SpecialistCapabilityProfile {
  readonly requiredCapabilities: readonly Capability[]
  readonly optionalCapabilities: readonly Capability[]
  readonly preferredModelFamilies: readonly string[]
  readonly minimumContextWindow: number
  readonly requiresReasoning: boolean
  readonly requiresToolCalling: boolean
  readonly requiresStreaming: boolean
}

export interface Interface {
  readonly matchModelToRequirements: (
    providerID: string,
    modelID: string,
    modelCapabilities: readonly Capability[],
    modelContextWindow: number,
    modelSupportsReasoning: boolean,
    modelSupportsTools: boolean,
    requirements: ResourceRequirements,
  ) => Effect.Effect<ModelCapabilityFit>
  readonly rankModelsByFit: (
    candidates: readonly {
      providerID: string
      modelID: string
      capabilities: readonly Capability[]
      contextWindow: number
      supportsReasoning: boolean
      supportsTools: boolean
    }[],
    requirements: ResourceRequirements,
  ) => Effect.Effect<readonly ModelCapabilityFit[]>
  readonly evaluateSpecialist: (
    providerID: string,
    modelID: string,
    modelCapabilities: readonly Capability[],
    modelContextWindow: number,
    modelSupportsReasoning: boolean,
    modelSupportsTools: boolean,
    profile: SpecialistCapabilityProfile,
  ) => Effect.Effect<ModelCapabilityFit>
}

const make = Effect.gen(function* () {
  const matchModelToRequirements = (
    providerID: string,
    modelID: string,
    modelCapabilities: readonly Capability[],
    modelContextWindow: number,
    modelSupportsReasoning: boolean,
    modelSupportsTools: boolean,
    requirements: ResourceRequirements,
  ): Effect.Effect<ModelCapabilityFit> =>
    Effect.sync(() => {
      const modelCaps = new Set(modelCapabilities)
      const matched = requirements.requiredCapabilities.filter((c) => modelCaps.has(c))
      const missing = requirements.requiredCapabilities.filter((c) => !modelCaps.has(c))
      const capabilityScore = requirements.requiredCapabilities.length > 0
        ? matched.length / requirements.requiredCapabilities.length
        : 1

      const contextFit = modelContextWindow >= requirements.estimatedContextTokens ? 1
        : modelContextWindow / requirements.estimatedContextTokens

      const reasoningFit = !requirements.needsReasoning || modelSupportsReasoning ? 1 : 0
      const toolFit = !requirements.needsToolCalling || modelSupportsTools ? 1 : 0

      const fitScore = capabilityScore * 0.5 + contextFit * 0.25 + reasoningFit * 0.125 + toolFit * 0.125

      return {
        providerID,
        modelID,
        matchedCapabilities: matched,
        missingCapabilities: missing,
        fitScore,
        meetsAllRequirements: missing.length === 0 && contextFit >= 1 && reasoningFit >= 1 && toolFit >= 1,
      }
    })

  const rankModelsByFit = (
    candidates: readonly {
      providerID: string
      modelID: string
      capabilities: readonly Capability[]
      contextWindow: number
      supportsReasoning: boolean
      supportsTools: boolean
    }[],
    requirements: ResourceRequirements,
  ): Effect.Effect<readonly ModelCapabilityFit[]> =>
    Effect.all(
      candidates.map((c) =>
        matchModelToRequirements(
          c.providerID,
          c.modelID,
          c.capabilities,
          c.contextWindow,
          c.supportsReasoning,
          c.supportsTools,
          requirements,
        ),
      ),
    ).pipe(Effect.map((fits) => [...fits].sort((a, b) => b.fitScore - a.fitScore)))

  const evaluateSpecialist = (
    providerID: string,
    modelID: string,
    modelCapabilities: readonly Capability[],
    modelContextWindow: number,
    modelSupportsReasoning: boolean,
    modelSupportsTools: boolean,
    profile: SpecialistCapabilityProfile,
  ): Effect.Effect<ModelCapabilityFit> =>
    Effect.sync(() => {
      const modelCaps = new Set(modelCapabilities)
      const allRequired = [...profile.requiredCapabilities, ...profile.optionalCapabilities]
      const matched = allRequired.filter((c) => modelCaps.has(c))
      const missingRequired = profile.requiredCapabilities.filter((c) => !modelCaps.has(c))
      const missingOptional = profile.optionalCapabilities.filter((c) => !modelCaps.has(c))

      const requiredScore = profile.requiredCapabilities.length > 0
        ? (profile.requiredCapabilities.length - missingRequired.length) / profile.requiredCapabilities.length
        : 1
      const optionalScore = profile.optionalCapabilities.length > 0
        ? missingOptional.length / profile.optionalCapabilities.length
        : 1

      const contextFit = modelContextWindow >= profile.minimumContextWindow ? 1
        : modelContextWindow / profile.minimumContextWindow

      const reasoningFit = !profile.requiresReasoning || modelSupportsReasoning ? 1 : 0
      const toolFit = !profile.requiresToolCalling || modelSupportsTools ? 1 : 0

      const fitScore = requiredScore * 0.4 + optionalScore * 0.2 + contextFit * 0.2 + reasoningFit * 0.1 + toolFit * 0.1

      return {
        providerID,
        modelID,
        matchedCapabilities: matched,
        missingCapabilities: missingRequired,
        fitScore,
        meetsAllRequirements: missingRequired.length === 0 && contextFit >= 1 && reasoningFit >= 1 && toolFit >= 1,
      }
    })

  return Service.of({ matchModelToRequirements, rankModelsByFit, evaluateSpecialist })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityMatcher") {}

const layer = Layer.effect(Service, make)
export { layer }
