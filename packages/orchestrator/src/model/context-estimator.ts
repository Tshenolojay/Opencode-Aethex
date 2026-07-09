export * as ContextEstimator from "./context-estimator"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability } from "../types/capability"

export interface ContextEstimate {
  readonly estimatedRequiredTokens: number
  readonly estimatedOutputTokens: number
  readonly reasoningComplexity: number
  readonly estimatedTotalTokens: number
  readonly contextLimit: number
  readonly withinLimit: boolean
  readonly utilizationRatio: number
  readonly compressionRecommended: boolean
  readonly confidence: number
}

export interface Interface {
  readonly estimateContext: (taskType: string, capabilities: readonly Capability[], complexity: number, conversationLength: number, repositorySize: number) => Effect.Effect<ContextEstimate>
  readonly estimateContextForModel: (model: ModelMetadata, taskType: string, complexity: number, conversationLength: number, repositorySize: number) => ContextEstimate
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ContextEstimator") {}

function estimateTokens(taskType: string, complexity: number, conversationLength: number, repositorySize: number): { input: number; output: number; reasoning: number } {
  const baseInput = 1000
  const conversationTokens = conversationLength * 500
  const repoTokens = Math.min(repositorySize * 10, 50000)

  const taskMultiplier: Record<string, number> = {
    "bug-fix": 1.5, "debugging": 1.5, "code-generation": 1.2,
    "architecture-design": 2.0, "refactoring": 1.8, "documentation": 1.3,
    "security-review": 1.6, "testing": 1.2, "dependency-investigation": 1.4,
    "performance-optimisation": 1.7, "repository-search": 1.1, "general-chat": 0.5,
  }

  const multiplier = taskMultiplier[taskType] ?? 1.0
  const complexityFactor = 1 + (complexity * 0.5)
  const input = Math.round((baseInput + conversationTokens + repoTokens) * multiplier * complexityFactor)
  const output = Math.round(2000 * multiplier)
  const reasoning = complexity > 0.7 ? Math.round(input * 0.3) : 0

  return { input, output, reasoning }
}

function estimateContextForModel(model: ModelMetadata, taskType: string, complexity: number, conversationLength: number, repositorySize: number): ContextEstimate {
  const { input, output, reasoning } = estimateTokens(taskType, complexity, conversationLength, repositorySize)
  const totalTokens = input + output + reasoning
  const withinLimit = totalTokens <= model.contextLimit
  const utilizationRatio = totalTokens / model.contextLimit
  const compressionRecommended = utilizationRatio > 0.8

  return {
    estimatedRequiredTokens: input,
    estimatedOutputTokens: output,
    reasoningComplexity: reasoning,
    estimatedTotalTokens: totalTokens,
    contextLimit: model.contextLimit,
    withinLimit,
    utilizationRatio,
    compressionRecommended,
    confidence: model.qualityScore > 0 ? Math.min(model.qualityScore + 0.1, 1) : 0.5,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* ModelCatalog.Service

    const estimateContext: Interface["estimateContext"] = Effect.fn("ContextEstimator.estimateContext")(function* (taskType, capabilities, complexity, conversationLength, repositorySize) {
      const { input, output, reasoning } = estimateTokens(taskType, complexity, conversationLength, repositorySize)
      const total = input + output + reasoning
      const recommendedModels = yield* catalog.availableModels()
      const bestModel = recommendedModels
        .filter((m) => m.contextLimit >= total)
        .sort((a, b) => a.contextLimit - b.contextLimit)[0]

      const limit = bestModel?.contextLimit ?? 128000
      return {
        estimatedRequiredTokens: input,
        estimatedOutputTokens: output,
        reasoningComplexity: reasoning,
        estimatedTotalTokens: total,
        contextLimit: limit,
        withinLimit: bestModel !== undefined,
        utilizationRatio: total / limit,
        compressionRecommended: total / limit > 0.8,
        confidence: 0.7,
      }
    })

    return Service.of({ estimateContext, estimateContextForModel })
  }),
)

export { layer }
