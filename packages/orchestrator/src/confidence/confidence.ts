export * as ConfidenceEngine from "./confidence"

import { Context, Effect, Layer, Schema } from "effect"
import type { TaskClassification } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceFactor, ConfidenceScore } from "../types/confidence"

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
  if (score >= 0.65) return "high"
  if (score >= 0.35) return "medium"
  return "low"
}

const estimate: Interface["estimate"] = Effect.fn("ConfidenceEngine.estimate")(function* (input) {
  const { classification } = input

  const factors: number[] = []

  const typeBias: Record<string, number> = {
    "general-chat": 0.95,
    "documentation": 0.85,
    "repository-search": 0.8,
    "code-generation": 0.7,
    "testing": 0.6,
    "refactoring": 0.5,
    "debugging": 0.45,
    "bug-fix": 0.4,
    "dependency-investigation": 0.4,
    "architecture-design": 0.3,
    "performance-optimisation": 0.3,
    "security-review": 0.25,
  }
  factors.push(typeBias[classification.type] ?? 0.5)
  factors.push(1.0 - classification.complexity * 0.4)

  const repoPenalty = Math.min(input.repositorySize / 100000, 0.3)
  factors.push(1.0 - repoPenalty)

  const convoPenalty = Math.min(input.conversationLength / 50, 0.2)
  factors.push(1.0 - convoPenalty)

  if (input.contextAvailable) factors.push(1.1)
  if (input.filesAttached > 0) factors.push(1.05 + Math.min(input.filesAttached * 0.02, 0.1))
  if (input.previousToolResults) factors.push(1.05)

  const score = factors.reduce((acc, f) => acc * f, 1.0) / Math.pow(factors.length, factors.length)

  return Schema.decodeSync(Schema.Literals(["high", "medium", "low"] as const))(scoreToLevel(score)) as ConfidenceLevel
})

const estimateWithScore: Interface["estimateWithScore"] = Effect.fn("ConfidenceEngine.estimateWithScore")(function* (input) {
  const factors: ConfidenceFactor[] = []

  const typeBias: Record<string, number> = {
    "general-chat": 0.95,
    "documentation": 0.85,
    "repository-search": 0.8,
    "code-generation": 0.7,
    "testing": 0.6,
    "refactoring": 0.5,
    "debugging": 0.45,
    "bug-fix": 0.4,
    "dependency-investigation": 0.4,
    "architecture-design": 0.3,
    "performance-optimisation": 0.3,
    "security-review": 0.25,
  }
  const bias = typeBias[input.classification.type] ?? 0.5
  factors.push({ name: "task-type-bias", value: bias, weight: 0.25, description: `Task type bias for ${input.classification.type}` })

  const complexityFactor = 1.0 - input.classification.complexity * 0.4
  factors.push({ name: "complexity", value: complexityFactor, weight: 0.2, description: "Task complexity penalty" })

  const repoPenalty = Math.min(input.repositorySize / 100000, 0.3)
  factors.push({ name: "repository-size", value: 1.0 - repoPenalty, weight: 0.15, description: "Repository size penalty" })

  const convoPenalty = Math.min(input.conversationLength / 50, 0.2)
  factors.push({ name: "conversation-length", value: 1.0 - convoPenalty, weight: 0.1, description: "Conversation length penalty" })

  const contextBonus = input.contextAvailable ? 1.1 : 1.0
  factors.push({ name: "context-available", value: contextBonus, weight: 0.1, description: "Context availability bonus" })

  const filesBonus = input.filesAttached > 0 ? 1.05 + Math.min(input.filesAttached * 0.02, 0.1) : 1.0
  factors.push({ name: "files-attached", value: filesBonus, weight: 0.08, description: "Files attached bonus" })

  const toolResultsBonus = input.previousToolResults ? 1.05 : 1.0
  factors.push({ name: "previous-tool-results", value: toolResultsBonus, weight: 0.07, description: "Previous tool results bonus" })

  if (input.classifications.length > 1) {
    const classificationConflict = 1.0 - (input.classifications.length - 1) * 0.1
    factors.push({ name: "classification-conflict", value: Math.max(classificationConflict, 0.5), weight: 0.05, description: "Multiple classifications reduce confidence" })
  }

  const totalWeight = factors.reduce((acc, f) => acc + f.weight, 0)
  const weightedScore = factors.reduce((acc, f) => acc + f.value * f.weight, 0) / totalWeight

  const level = scoreToLevel(weightedScore)

  return { score: weightedScore, level, factors, factorCount: factors.length }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ estimate, estimateWithScore })
  }),
)

export { layer }
