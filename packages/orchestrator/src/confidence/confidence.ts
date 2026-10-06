export * as ConfidenceEngine from "./confidence"

import { Context, Effect, Layer, Schema } from "effect"
import type { TaskClassification } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceFactor, ConfidenceScore } from "../types/confidence"
import { Config } from "../pipeline/orchestrator-config"

export interface Input {
  readonly classification: TaskClassification
  readonly repositorySize: number
  readonly conversationLength: number
  readonly filesAttached: number
  readonly promptComplexity: number
  readonly contextAvailable: boolean
  readonly previousToolResults: boolean
}

export interface InputRich extends Input {
  readonly classifications: readonly { readonly type: string; readonly confidence: number }[]
  readonly sessionMetadata: Record<string, string> | undefined
  readonly toolHistory: readonly string[] | undefined
}

export interface Interface {
  readonly estimate: (input: Input) => Effect.Effect<ConfidenceLevel>
  readonly estimateWithScore: (input: InputRich) => Effect.Effect<ConfidenceScore>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConfidenceEngine") {}

export function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= Config.minimumConfidence) return "high"
  if (score >= Config.mediumConfidence) return "medium"
  return "low"
}

const typeBias: Record<string, number> = {
  "general-chat": 0.95,
  documentation: 0.85,
  "repository-search": 0.8,
  "code-generation": 0.7,
  testing: 0.6,
  refactoring: 0.5,
  debugging: 0.45,
  "bug-fix": 0.4,
  "dependency-investigation": 0.4,
  "architecture-design": 0.3,
  "performance-optimisation": 0.3,
  "security-review": 0.25,
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function buildFactors(input: InputRich): ConfidenceFactor[] {
  const factors: ConfidenceFactor[] = []

  const bias = clamp01(typeBias[input.classification.type] ?? 0.5)
  factors.push({
    name: "task-type-bias",
    value: bias,
    weight: 0.25,
    description: `Prior confidence for ${input.classification.type}`,
  })

  const complexityFactor = clamp01(1 - input.promptComplexity * 0.65)
  factors.push({
    name: "complexity",
    value: complexityFactor,
    weight: 0.2,
    description: "Confidence remaining after task-complexity penalty",
  })

  const repositoryFactor =
    input.repositorySize <= 0
      ? 0.65
      : clamp01(1 - Math.min(input.repositorySize / 100_000, 0.35))
  factors.push({
    name: "repository-size",
    value: repositoryFactor,
    weight: 0.12,
    description: input.repositorySize <= 0 ? "Repository size is unknown" : "Repository-size confidence",
  })

  const conversationFactor = clamp01(1 - Math.min(input.conversationLength / 100, 0.35))
  factors.push({
    name: "conversation-length",
    value: conversationFactor,
    weight: 0.08,
    description: "Conversation-history confidence",
  })

  factors.push({
    name: "context-available",
    value: input.contextAvailable ? 0.95 : 0.55,
    weight: 0.1,
    description: input.contextAvailable ? "Relevant runtime context is available" : "Runtime context is sparse",
  })

  factors.push({
    name: "files-attached",
    value: input.filesAttached > 0 ? 0.95 : 0.8,
    weight: 0.05,
    description: input.filesAttached > 0 ? "Prompt includes direct file context" : "No direct file attachment context",
  })

  factors.push({
    name: "previous-tool-results",
    value: input.previousToolResults ? 0.95 : 0.8,
    weight: 0.05,
    description: input.previousToolResults ? "Prior tool evidence is available" : "No prior tool evidence",
  })

  const primaryClassification = input.classifications[0]
  factors.push({
    name: "classification-certainty",
    value: clamp01(primaryClassification?.confidence ?? 0.75),
    weight: 0.08,
    description: "Classifier certainty for the current prompt",
  })

  const secondaryConfidence = input.classifications
    .slice(1)
    .reduce((total, classification) => total + clamp01(classification.confidence), 0)
  const agreement = input.classifications.length <= 1
    ? 1
    : clamp01(1 - Math.min(secondaryConfidence / 2, 0.55))
  factors.push({
    name: "classification-agreement",
    value: agreement,
    weight: 0.07,
    description: "Agreement between primary and secondary task classifications",
  })

  return factors
}

function weightedScore(factors: readonly ConfidenceFactor[]): number {
  const type = factors.find((factor) => factor.name === "task-type-bias")?.value ?? 0.5
  const complexity = factors.find((factor) => factor.name === "complexity")?.value ?? 0.5
  const environmental = factors.filter(
    (factor) => factor.name !== "task-type-bias" && factor.name !== "complexity",
  )
  const envWeight = environmental.reduce((acc, factor) => acc + factor.weight, 0)
  const envScore =
    envWeight === 0
      ? 0.75
      : environmental.reduce((acc, factor) => acc + factor.value * factor.weight, 0) / envWeight

  // Task type and complexity remain the gating signals. Runtime evidence can
  // modestly strengthen or weaken that prior, but never manufacture certainty.
  return clamp01(type * complexity * (0.75 + 0.25 * clamp01(envScore)))
}

const estimate: Interface["estimate"] = Effect.fn("ConfidenceEngine.estimate")(function* (input) {
  const score = weightedScore(
    buildFactors({
      ...input,
      classifications: [],
      sessionMetadata: undefined,
      toolHistory: undefined,
    }),
  )
  return Schema.decodeSync(Schema.Literals(["high", "medium", "low"] as const))(scoreToLevel(score)) as ConfidenceLevel
})

const estimateWithScore: Interface["estimateWithScore"] = Effect.fn("ConfidenceEngine.estimateWithScore")(function* (input) {
  const factors = buildFactors(input)
  const score = weightedScore(factors)
  const level = scoreToLevel(score)
  return { score, level, factors, factorCount: factors.length }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ estimate, estimateWithScore })
  }),
)

export { layer }
