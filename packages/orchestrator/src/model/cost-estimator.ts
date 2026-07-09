export * as CostEstimator from "./cost-estimator"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"

export interface CostEstimate {
  readonly providerID: string
  readonly modelID: string
  readonly estimatedInputTokens: number
  readonly estimatedOutputTokens: number
  readonly costPerInputToken: number
  readonly costPerOutputToken: number
  readonly estimatedInputCost: number
  readonly estimatedOutputCost: number
  readonly estimatedTotalCost: number
  readonly confidence: number
  readonly currency: string
}

export interface Interface {
  readonly estimateCost: (providerID: string, modelID: string, inputTokens: number, outputTokens: number) => Effect.Effect<CostEstimate | undefined>
  readonly estimateCostForModel: (model: ModelMetadata, inputTokens: number, outputTokens: number) => CostEstimate
  readonly compareCosts: (models: readonly ModelMetadata[], inputTokens: number, outputTokens: number) => Effect.Effect<readonly CostEstimate[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CostEstimator") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const catalog = yield* ModelCatalog.Service

    const estimateCostForModel: Interface["estimateCostForModel"] = function (model, inputTokens, outputTokens) {
      const inputCost = inputTokens * model.costPerInputToken
      const outputCost = outputTokens * model.costPerOutputToken
      const totalCost = inputCost + outputCost
      const confidence = model.qualityScore > 0 ? Math.min(model.qualityScore + 0.1, 1) : 0.5
      return {
        providerID: model.providerID,
        modelID: model.modelID,
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        costPerInputToken: model.costPerInputToken,
        costPerOutputToken: model.costPerOutputToken,
        estimatedInputCost: inputCost,
        estimatedOutputCost: outputCost,
        estimatedTotalCost: totalCost,
        confidence,
        currency: "USD",
      }
    }

    const estimateCost: Interface["estimateCost"] = Effect.fn("CostEstimator.estimateCost")(function* (providerID, modelID, inputTokens, outputTokens) {
      const model = yield* catalog.getModel(providerID, modelID)
      if (!model) return undefined
      return estimateCostForModel(model, inputTokens, outputTokens)
    })

    const compareCosts: Interface["compareCosts"] = Effect.fn("CostEstimator.compareCosts")(function* (models, inputTokens, outputTokens) {
      return models.map((m) => estimateCostForModel(m, inputTokens, outputTokens))
        .sort((a, b) => a.estimatedTotalCost - b.estimatedTotalCost)
    })

    return Service.of({ estimateCost, estimateCostForModel, compareCosts })
  }),
)

export { layer }
