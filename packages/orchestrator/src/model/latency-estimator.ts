export * as LatencyEstimator from "./latency-estimator"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import { ProviderCatalog } from "./provider-catalog"

export interface LatencyEstimate {
  readonly providerID: string
  readonly modelID: string
  readonly estimatedModelLatencyMs: number
  readonly estimatedProviderLatencyMs: number
  readonly estimatedTotalLatencyMs: number
  readonly confidence: number
  readonly factors: readonly string[]
}

export interface Interface {
  readonly estimateLatency: (providerID: string, modelID: string) => Effect.Effect<LatencyEstimate | undefined>
  readonly estimateLatencyForModel: (model: ModelMetadata, providerLatencyMs?: number) => LatencyEstimate
  readonly compareLatency: (models: readonly ModelMetadata[]) => Effect.Effect<readonly LatencyEstimate[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/LatencyEstimator") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const modelCatalog = yield* ModelCatalog.Service
    const providerCatalog = yield* ProviderCatalog.Service

    const estimateLatencyForModel: Interface["estimateLatencyForModel"] = function (model, providerLatencyMs = 200) {
      const modelLatency = model.estimatedLatencyMs
      const totalLatency = providerLatencyMs + modelLatency
      const factors: string[] = []
      if (model.estimatedLatencyMs < 500) factors.push("fast-model")
      else if (model.estimatedLatencyMs < 1500) factors.push("average-model-speed")
      else factors.push("slower-model")
      if (providerLatencyMs > 500) factors.push("higher-provider-latency")

      return {
        providerID: model.providerID,
        modelID: model.modelID,
        estimatedModelLatencyMs: modelLatency,
        estimatedProviderLatencyMs: providerLatencyMs,
        estimatedTotalLatencyMs: totalLatency,
        confidence: model.reliabilityScore > 0 ? Math.min(model.reliabilityScore + 0.1, 1) : 0.5,
        factors,
      }
    }

    const estimateLatency: Interface["estimateLatency"] = Effect.fn("LatencyEstimator.estimateLatency")(function* (providerID, modelID) {
      const model = yield* modelCatalog.getModel(providerID, modelID)
      if (!model) return undefined
      const provider = yield* providerCatalog.getProvider(providerID)
      const providerLatency = provider?.averageLatencyMs ?? 200
      return estimateLatencyForModel(model, providerLatency)
    })

    const compareLatency: Interface["compareLatency"] = Effect.fn("LatencyEstimator.compareLatency")(function* (models) {
      return models.map((m) => estimateLatencyForModel(m))
        .sort((a, b) => a.estimatedTotalLatencyMs - b.estimatedTotalLatencyMs)
    })

    return Service.of({ estimateLatency, estimateLatencyForModel, compareLatency })
  }),
)

export { layer }
