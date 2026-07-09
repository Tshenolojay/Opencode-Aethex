export * as FallbackStrategy from "./fallback-strategy"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability } from "../types/capability"

export type FallbackTier =
  | "primary"
  | "equivalent-capability"
  | "lower-cost"
  | "smaller-context"
  | "general-purpose"

export interface FallbackPlan {
  readonly tiers: readonly FallbackTier[]
  readonly primary: ModelMetadata | undefined
  readonly equivalent: readonly ModelMetadata[]
  readonly lowerCost: readonly ModelMetadata[]
  readonly smallerContext: readonly ModelMetadata[]
  readonly generalPurpose: readonly ModelMetadata[]
  readonly totalCandidates: number
  readonly reason: string
}

export interface Interface {
  readonly planFallback: (capabilities: readonly Capability[], excludeProviderID?: string) => Effect.Effect<FallbackPlan>
  readonly planFallbackFromModels: (primary: ModelMetadata, candidates: readonly ModelMetadata[]) => FallbackPlan
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/FallbackStrategy") {}

function hasAllCapabilities(model: ModelMetadata, required: readonly Capability[]): boolean {
  return required.every((c) => model.capabilities.includes(c))
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* ModelCatalog.Service

    const planFallback: Interface["planFallback"] = Effect.fn("FallbackStrategy.planFallback")(function* (capabilities, excludeProviderID) {
      const allModels = yield* catalog.availableModels()
      const candidates = excludeProviderID
        ? allModels.filter((m) => m.providerID !== excludeProviderID)
        : allModels

      const primary = candidates.find((m) => hasAllCapabilities(m, capabilities))

      const equivalent = candidates
        .filter((m) => m !== primary && hasAllCapabilities(m, capabilities))
        .sort((a, b) => b.qualityScore - a.qualityScore)

      const lowerCost = candidates
        .filter((m) => m !== primary && m.costPerInputToken + m.costPerOutputToken < (primary?.costPerInputToken ?? Infinity) + (primary?.costPerOutputToken ?? Infinity))
        .sort((a, b) => (a.costPerInputToken + a.costPerOutputToken) - (b.costPerInputToken + b.costPerOutputToken))

      const smallerContext = candidates
        .filter((m) => m !== primary && m.contextLimit < (primary?.contextLimit ?? Infinity))
        .sort((a, b) => a.contextLimit - b.contextLimit)

      const generalPurpose = candidates
        .filter((m) => m !== primary && m.qualityScore > 0.7)
        .sort((a, b) => b.qualityScore - a.qualityScore)

      const reason = primary
        ? `primary model selected, ${equivalent.length} equivalent, ${lowerCost.length} lower-cost, ${smallerContext.length} smaller-context, ${generalPurpose.length} general-purpose fallbacks`
        : `no primary match found for ${capabilities.length} capabilities`

      return {
        tiers: ["primary", "equivalent-capability", "lower-cost", "smaller-context", "general-purpose"],
        primary,
        equivalent,
        lowerCost,
        smallerContext,
        generalPurpose,
        totalCandidates: candidates.length,
        reason,
      }
    })

    const planFallbackFromModels: Interface["planFallbackFromModels"] = function (primary, candidates) {
      const capabilities = primary.capabilities
      const equivalent = candidates
        .filter((m) => m.modelID !== primary.modelID && hasAllCapabilities(m, capabilities))
        .sort((a, b) => b.qualityScore - a.qualityScore)

      const lowerCost = candidates
        .filter((m) => m.modelID !== primary.modelID && (m.costPerInputToken + m.costPerOutputToken) < (primary.costPerInputToken + primary.costPerOutputToken))
        .sort((a, b) => (a.costPerInputToken + a.costPerOutputToken) - (b.costPerInputToken + b.costPerOutputToken))

      const smallerContext = candidates
        .filter((m) => m.modelID !== primary.modelID && m.contextLimit < primary.contextLimit)
        .sort((a, b) => a.contextLimit - b.contextLimit)

      const generalPurpose = candidates
        .filter((m) => m.modelID !== primary.modelID && m.qualityScore > 0.7)
        .sort((a, b) => b.qualityScore - a.qualityScore)

      return {
        tiers: ["primary", "equivalent-capability", "lower-cost", "smaller-context", "general-purpose"],
        primary,
        equivalent,
        lowerCost,
        smallerContext,
        generalPurpose,
        totalCandidates: candidates.length,
        reason: `fallback plan for ${primary.modelID} with ${equivalent.length} equivalents`,
      }
    }

    return Service.of({ planFallback, planFallbackFromModels })
  }),
)

export { layer }
