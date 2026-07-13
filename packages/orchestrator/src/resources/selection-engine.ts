export * as SelectionEngine from "./selection-engine"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { OrchestrationContext } from "../state/context"
import type { ModelMetadata } from "../model/model-catalog"
import type { ProviderMetadata } from "../model/provider-catalog"
import type { ProviderHealthSnapshot } from "./provider-health"
import type { UserPreferences } from "./preference-manager"
import type { ResourceRequirements } from "./resource-estimator"
import type { ModelCapabilityFit, SpecialistCapabilityProfile } from "./capability-matcher"
import type { FallbackChain } from "./fallback-engine"
import type { RoutingStrategy, ScoredCandidate } from "./routing-policy"
import { CapabilityMatcher } from "./capability-matcher"
import { ResourceEstimator } from "./resource-estimator"
import { ProviderHealth } from "./provider-health"
import { ProviderAvailability } from "./provider-availability"
import { BenchmarkStore } from "./benchmark-store"
import { PerformanceMemory } from "./performance-memory"
import { PreferenceManager } from "./preference-manager"
import { RoutingPolicy } from "./routing-policy"
import { FallbackEngine } from "./fallback-engine"
import { ModelCatalog } from "../model/model-catalog"
import { ProviderCatalog } from "../model/provider-catalog"

export interface ModelSelection {
  readonly providerID: string
  readonly modelID: string
  readonly fallbackChain: FallbackChain
  readonly strategy: RoutingStrategy
  readonly confidence: number
  readonly reasoning: readonly string[]
  readonly requirements: ResourceRequirements
}

export interface Interface {
  readonly selectForOrchestration: (
    orchestrationContext: OrchestrationContext,
    strategy?: RoutingStrategy,
  ) => Effect.Effect<ModelSelection | undefined>
  readonly selectForSpecialist: (
    specialistID: string,
    requiredCapabilities: readonly Capability[],
    optionalCapabilities: readonly Capability[],
    strategy?: RoutingStrategy,
  ) => Effect.Effect<ModelSelection | undefined>
  readonly selectForTask: (
    requiredCapabilities: readonly Capability[],
    strategy?: RoutingStrategy,
  ) => Effect.Effect<ModelSelection | undefined>
  readonly getAvailableProviders: () => Effect.Effect<readonly string[]>
  readonly getAvailableModels: (providerID: string) => Effect.Effect<readonly string[]>
}

const make = Effect.gen(function* () {
  const capabilityMatcher = yield* CapabilityMatcher.Service
  const resourceEstimator = yield* ResourceEstimator.Service
  const providerHealth = yield* ProviderHealth.Service
  const providerAvailability = yield* ProviderAvailability.Service
  const benchmarkStore = yield* BenchmarkStore.Service
  const performanceMemory = yield* PerformanceMemory.Service
  const preferenceManager = yield* PreferenceManager.Service
  const routingPolicy = yield* RoutingPolicy.Service
  const fallbackEngine = yield* FallbackEngine.Service
  const modelCatalog = yield* ModelCatalog.Service
  const providerCatalog = yield* ProviderCatalog.Service

  interface Candidates {
    readonly catalogModels: readonly ModelMetadata[]
    readonly catalogProviders: readonly ProviderMetadata[]
    readonly healthSnapshot: ProviderHealthSnapshot
    readonly preferences: UserPreferences
  }

  const resolveCandidates = Effect.gen(function* () {
    const catalogModels = yield* modelCatalog.allModels()
    const catalogProviders = yield* providerCatalog.allProviders()
    const healthSnapshot = yield* providerHealth.snapshot()
    const preferences = yield* preferenceManager.getPreferences()

    return {
      catalogModels,
      catalogProviders,
      healthSnapshot,
      preferences,
    }
  })

  const buildFits = (
    candidates: Candidates,
    requirements: ResourceRequirements,
    profile?: SpecialistCapabilityProfile,
  ) =>
    Effect.all(
      candidates.catalogModels.map((model: ModelMetadata) => {
        const supportsReasoning = model.capabilities.includes("reasoning")
        const supportsTools = model.supportsTools
        return profile
          ? capabilityMatcher.evaluateSpecialist(
              model.providerID,
              model.modelID,
              model.capabilities,
              model.contextLimit,
              supportsReasoning,
              supportsTools,
              profile,
            )
          : capabilityMatcher.matchModelToRequirements(
              model.providerID,
              model.modelID,
              model.capabilities,
              model.contextLimit,
              supportsReasoning,
              supportsTools,
              requirements,
            )
      }),
    )

  const selectForOrchestration = Effect.fn("SelectionEngine.selectForOrchestration")(
    function* (
      orchestrationContext: OrchestrationContext,
      strategy?: RoutingStrategy,
    ) {
      const requirements = yield* resourceEstimator.estimate(orchestrationContext)
      const effectiveStrategy = strategy ?? (yield* routingPolicy.getDefaultStrategy(requirements))
      const candidates = yield* resolveCandidates
      const fits = yield* buildFits(candidates, requirements)
      const healthScores = new Map<string, number>()
      for (const [id, state] of candidates.healthSnapshot.providers) {
        healthScores.set(id, state.healthScore)
      }

      const policyResult = yield* routingPolicy.score({
        strategy: effectiveStrategy,
        requirements,
        fits,
        healthScores,
        userPreferredProviders: candidates.preferences.preferredProviders,
        userPreferredModels: candidates.preferences.preferredModels,
        excludedProviders: candidates.preferences.excludedProviders,
        excludedModels: candidates.preferences.excludedModels,
      })

      const fallbackChain = yield* fallbackEngine.generateChain(
        policyResult.scoredCandidates,
        fits,
        requirements,
      )

      if (!fallbackChain) {
        return undefined
      }

      const reasoning = [
        `Strategy: ${effectiveStrategy}`,
        policyResult.reasoning,
        fallbackChain.reasoning,
        `Candidates evaluated: ${candidates.catalogModels.length}`,
      ]

      return {
        providerID: fallbackChain.primary.providerID,
        modelID: fallbackChain.primary.modelID,
        fallbackChain,
        strategy: effectiveStrategy,
        confidence: fallbackChain.primary.totalScore,
        reasoning,
        requirements,
      }
    })

  const selectForSpecialist = Effect.fn("SelectionEngine.selectForSpecialist")(
    function* (
      specialistID: string,
      requiredCapabilities: readonly Capability[],
      optionalCapabilities: readonly Capability[],
      strategy?: RoutingStrategy,
    ) {
      const requirements: ResourceRequirements = {
        requiredCapabilities,
        estimatedContextTokens: 16_000,
        needsStreaming: true,
        needsReasoning: requiredCapabilities.includes("architecture-analysis") || requiredCapabilities.includes("planning"),
        needsToolCalling: requiredCapabilities.some((c) =>
          ["code-generation", "tool-use"].includes(c),
        ),
        needsVision: false,
        complexityLevel: requiredCapabilities.length > 3 ? "critical" : requiredCapabilities.length > 1 ? "high" : "medium",
        estimatedExecutionTimeMs: 60_000,
        maxAcceptableLatencyMs: 30_000,
        qualityFloor: 0.5,
      }

      const profile: SpecialistCapabilityProfile = {
        requiredCapabilities,
        optionalCapabilities,
        preferredModelFamilies: [],
        minimumContextWindow: 16_000,
        requiresReasoning: requirements.needsReasoning,
        requiresToolCalling: requirements.needsToolCalling,
        requiresStreaming: true,
      }

      const effectiveStrategy = strategy ?? (yield* routingPolicy.getDefaultStrategy(requirements))
      const candidates = yield* resolveCandidates
      const fits = yield* buildFits(candidates, requirements, profile)
      const healthScores = new Map<string, number>()
      for (const [id, state] of candidates.healthSnapshot.providers) {
        healthScores.set(id, state.healthScore)
      }

      const policyResult = yield* routingPolicy.score({
        strategy: effectiveStrategy,
        requirements,
        fits,
        healthScores,
        userPreferredProviders: candidates.preferences.preferredProviders,
        userPreferredModels: candidates.preferences.preferredModels,
        excludedProviders: candidates.preferences.excludedProviders,
        excludedModels: candidates.preferences.excludedModels,
      })

      const fallbackChain = yield* fallbackEngine.generateChain(
        policyResult.scoredCandidates,
        fits,
        requirements,
      )

      if (!fallbackChain) {
        return undefined
      }

      return {
        providerID: fallbackChain.primary.providerID,
        modelID: fallbackChain.primary.modelID,
        fallbackChain,
        strategy: effectiveStrategy,
        confidence: fallbackChain.primary.totalScore,
        reasoning: [`Specialist: ${specialistID}`, ...policyResult.reasoning.split("; "), fallbackChain.reasoning],
        requirements,
      }
    })

  const selectForTask = (
    requiredCapabilities: readonly Capability[],
    strategy?: RoutingStrategy,
  ): Effect.Effect<ModelSelection | undefined> =>
    selectForSpecialist("_task", requiredCapabilities, [], strategy)

  const getAvailableProviders = Effect.fn("SelectionEngine.getAvailableProviders")(function* () {
    const allProviders = yield* providerCatalog.allProviders()
    const healthSnapshot = yield* providerHealth.snapshot()
    const available: string[] = []
    for (const p of allProviders) {
      const health = healthSnapshot.providers.get(p.providerID)
      const info = yield* providerAvailability.check(p.providerID, health)
      if (info.status === "available") available.push(p.providerID)
    }
    return available
  })

  const getAvailableModels = Effect.fn("SelectionEngine.getAvailableModels")(function* (providerID: string) {
      const allModels = yield* modelCatalog.allModels()
      return allModels.filter((m) => m.providerID === providerID).map((m) => m.modelID)
    })

  return Service.of({
    selectForOrchestration,
    selectForSpecialist,
    selectForTask,
    getAvailableProviders,
    getAvailableModels,
  })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SelectionEngine") {}

const layer = Layer.effect(Service, make)
export { layer }
