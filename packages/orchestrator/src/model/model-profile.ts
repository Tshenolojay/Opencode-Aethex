export * as ModelProfile from "./model-profile"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability } from "../types/capability"

export type ModelSpecialization =
  | "reasoning"
  | "coding"
  | "search"
  | "long-context"
  | "vision"
  | "planning"
  | "verification"
  | "architecture"
  | "documentation"
  | "general-purpose"

export interface ModelProfile {
  readonly modelID: string
  readonly providerID: string
  readonly specialization: ModelSpecialization
  readonly specializationScore: number
  readonly reasoningScore: number
  readonly codingScore: number
  readonly speedScore: number
  readonly qualityScore: number
  readonly costEfficiency: number
  readonly contextUtilization: number
  readonly streamingOptimized: boolean
  readonly toolOptimized: boolean
  readonly structuredOutput: boolean
  readonly multimodal: boolean
}

export interface Interface {
  readonly getProfile: (providerID: string, modelID: string) => Effect.Effect<ModelProfile | undefined>
  readonly buildProfile: (meta: ModelMetadata) => ModelProfile
  readonly getProfilesBySpecialization: (specialization: ModelSpecialization) => Effect.Effect<readonly ModelProfile[]>
  readonly allProfiles: () => Effect.Effect<readonly ModelProfile[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelProfile") {}

function inferSpecialization(meta: ModelMetadata): ModelSpecialization {
  const id = `${meta.providerID}/${meta.modelID}`.toLowerCase()
  if (/reasoner|deep.*think|opus|ultra/.test(id)) return "reasoning"
  if (/code|coder|codestral/.test(id)) return "coding"
  if (/search|retrieval/.test(id)) return "search"
  if (/100k|200k|1m|2m|large.*context|pro.*max/.test(id) && meta.contextLimit >= 64000) return "long-context"
  if (meta.supportsVision) return "vision"
  if (/plan|architect/.test(id)) return "planning"
  if (/verif|review|audit/.test(id)) return "verification"
  if (/architect|design/.test(id)) return "architecture"
  if (/doc|readme|summary/.test(id)) return "documentation"
  return "general-purpose"
}

function buildProfile(meta: ModelMetadata): ModelProfile {
  const specialization = inferSpecialization(meta)
  return {
    modelID: meta.modelID,
    providerID: meta.providerID,
    specialization,
    specializationScore: specialization === "general-purpose" ? 0.5 : 0.85,
    reasoningScore: meta.capabilities.includes("reasoning") ? 0.8 : 0.4,
    codingScore: meta.capabilities.includes("code-generation") ? 0.85 : 0.4,
    speedScore: meta.estimatedLatencyMs < 500 ? 0.9 : meta.estimatedLatencyMs < 1500 ? 0.7 : 0.4,
    qualityScore: meta.qualityScore,
    costEfficiency: meta.costPerInputToken + meta.costPerOutputToken < 0.01 ? 0.9 : meta.costPerInputToken + meta.costPerOutputToken < 0.05 ? 0.7 : 0.4,
    contextUtilization: Math.min(meta.contextLimit / 128000, 1),
    streamingOptimized: meta.supportsStreaming,
    toolOptimized: meta.supportsTools,
    structuredOutput: meta.supportsTools,
    multimodal: meta.supportsVision,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* ModelCatalog.Service

    const getProfile: Interface["getProfile"] = Effect.fn("ModelProfile.getProfile")(function* (providerID, modelID) {
      const model = yield* catalog.getModel(providerID, modelID)
      if (!model) return undefined
      return buildProfile(model)
    })

    const allProfiles: Interface["allProfiles"] = Effect.fn("ModelProfile.allProfiles")(function* () {
      const models = yield* catalog.allModels()
      return models.map(buildProfile)
    })

    const getProfilesBySpecialization: Interface["getProfilesBySpecialization"] = Effect.fn("ModelProfile.getProfilesBySpecialization")(function* (specialization) {
      const profiles = yield* allProfiles()
      return profiles.filter((p) => p.specialization === specialization)
    })

    return Service.of({ getProfile, buildProfile, getProfilesBySpecialization, allProfiles })
  }),
)

export { layer }
