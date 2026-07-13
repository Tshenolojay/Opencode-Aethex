export * as FallbackEngine from "./fallback-engine"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { ResourceRequirements } from "./resource-estimator"
import type { ModelCapabilityFit } from "./capability-matcher"
import type { ScoredCandidate } from "./routing-policy"

export interface FallbackChain {
  readonly primary: ScoredCandidate
  readonly secondary: ScoredCandidate | undefined
  readonly tertiary: ScoredCandidate | undefined
  readonly reasoning: string
}

export interface FallbackOptions {
  readonly maxChainLength: number
  readonly requireSameCapabilityFit: boolean
  readonly allowDifferentProvider: boolean
  readonly allowDifferentModel: boolean
  readonly minFitScore: number
}

export const DEFAULT_FALLBACK_OPTIONS: FallbackOptions = {
  maxChainLength: 3,
  requireSameCapabilityFit: true,
  allowDifferentProvider: true,
  allowDifferentModel: true,
  minFitScore: 0.3,
}

export interface Interface {
  readonly generateChain: (
    scoredCandidates: readonly ScoredCandidate[],
    fits: readonly ModelCapabilityFit[],
    requirements: ResourceRequirements,
    options?: Partial<FallbackOptions>,
  ) => Effect.Effect<FallbackChain | undefined>
  readonly generateChainFromFits: (
    fits: readonly ModelCapabilityFit[],
    requirements: ResourceRequirements,
    options?: Partial<FallbackOptions>,
  ) => Effect.Effect<FallbackChain | undefined>
}

function deduplicateCandidates(candidates: readonly ScoredCandidate[]): readonly ScoredCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((c) => {
    const key = `${c.providerID}/${c.modelID}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const make = Effect.gen(function* () {
  const generateChain = (
    scoredCandidates: readonly ScoredCandidate[],
    fits: readonly ModelCapabilityFit[],
    requirements: ResourceRequirements,
    options?: Partial<FallbackOptions>,
  ): Effect.Effect<FallbackChain | undefined> =>
    Effect.sync(() => {
      const opts = { ...DEFAULT_FALLBACK_OPTIONS, ...options }
      const unique = deduplicateCandidates(scoredCandidates)
      const eligible = unique.filter((c) => c.fitScore >= opts.minFitScore)

      if (eligible.length === 0) return undefined

      const primary = eligible[0]
      const secondary = eligible.length > 1 ? eligible[1] : undefined
      const tertiary = eligible.length > 2 ? eligible[2] : undefined

      const reasoning = [
        `Primary: ${primary.providerID}/${primary.modelID} (score: ${primary.totalScore.toFixed(3)})`,
        secondary ? `Secondary: ${secondary.providerID}/${secondary.modelID}` : "No secondary available",
        tertiary ? `Tertiary: ${tertiary.providerID}/${tertiary.modelID}` : "No tertiary available",
      ].join("; ")

      return { primary, secondary, tertiary, reasoning }
    })

  const generateChainFromFits = (
    fits: readonly ModelCapabilityFit[],
    requirements: ResourceRequirements,
    options?: Partial<FallbackOptions>,
  ): Effect.Effect<FallbackChain | undefined> =>
    Effect.sync(() => {
      const opts = { ...DEFAULT_FALLBACK_OPTIONS, ...options }
      const eligible = fits
        .filter((f) => f.fitScore >= opts.minFitScore)
        .sort((a, b) => b.fitScore - a.fitScore)

      if (eligible.length === 0) return undefined

      const primary = eligible[0]
      const secondary = eligible.length > 1 ? eligible[1] : undefined
      const tertiary = eligible.length > 2 ? eligible[2] : undefined

      const toScored = (fit: ModelCapabilityFit): ScoredCandidate => ({
        providerID: fit.providerID,
        modelID: fit.modelID,
        fitScore: fit.fitScore,
        qualityScore: fit.fitScore,
        costScore: 0.5,
        latencyScore: 0.5,
        healthScore: 1,
        preferenceScore: 0,
        totalScore: fit.fitScore,
        reasoning: fit.meetsAllRequirements ? ["Meets all requirements"] : [`Missing: ${fit.missingCapabilities.join(", ")}`],
      })

      const reasoning = [
        `Primary: ${primary.providerID}/${primary.modelID} (fit: ${primary.fitScore.toFixed(3)})`,
        secondary ? `Secondary: ${secondary.providerID}/${secondary.modelID}` : "No secondary",
        tertiary ? `Tertiary: ${tertiary.providerID}/${tertiary.modelID}` : "No tertiary",
      ].join("; ")

      return {
        primary: toScored(primary),
        secondary: secondary ? toScored(secondary) : undefined,
        tertiary: tertiary ? toScored(tertiary) : undefined,
        reasoning,
      }
    })

  return Service.of({ generateChain, generateChainFromFits })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/FallbackEngine") {}

const layer = Layer.effect(Service, make)
export { layer }
