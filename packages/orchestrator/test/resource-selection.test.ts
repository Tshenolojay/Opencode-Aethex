import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Catalog } from "../src/catalog"
import { ModelCatalog } from "../src/model/model-catalog"
import { ProviderCatalog } from "../src/model/provider-catalog"
import { SelectionEngine } from "../src/resources/selection-engine"
import { CapabilityMatcher } from "../src/resources/capability-matcher"
import { ResourceEstimator } from "../src/resources/resource-estimator"
import { ProviderHealth } from "../src/resources/provider-health"
import { ProviderAvailability } from "../src/resources/provider-availability"
import { BenchmarkStore } from "../src/resources/benchmark-store"
import { PerformanceMemory } from "../src/resources/performance-memory"
import { PreferenceManager } from "../src/resources/preference-manager"
import { RoutingPolicy } from "../src/resources/routing-policy"
import { FallbackEngine } from "../src/resources/fallback-engine"

const catalogServices = Layer.mergeAll(ModelCatalog.layer, ProviderCatalog.layer).pipe(
  Layer.provideMerge(Catalog.layer),
)

const dependencies = Layer.mergeAll(
  CapabilityMatcher.layer,
  ResourceEstimator.layer,
  ProviderHealth.layer,
  ProviderAvailability.layer,
  BenchmarkStore.layer,
  PerformanceMemory.layer,
  PreferenceManager.layer,
  RoutingPolicy.layer,
  FallbackEngine.layer,
  catalogServices,
)

const layer = SelectionEngine.layer.pipe(Layer.provideMerge(dependencies))

describe("SelectionEngine live runtime catalog", () => {
  test("selects a model hydrated from the runtime snapshot", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const catalog = yield* Catalog.Service
        const selection = yield* SelectionEngine.Service

        yield* catalog.replace({
          providers: [{ id: "live-provider", name: "Live Provider" }],
          models: [
            {
              id: "deep-reasoner-code",
              providerID: "live-provider",
              family: "reasoner",
              name: "Deep Reasoner Code",
              capabilities: {
                tools: true,
                input: ["text", "image"],
                output: ["text", "json", "stream"],
              },
              status: "active",
              enabled: true,
              limit: { context: 128_000, output: 16_000 },
              cost: [{ input: 0.000001, output: 0.000002 }],
            },
          ],
          defaultModel: { providerID: "live-provider", modelID: "deep-reasoner-code" },
        })

        return {
          providers: yield* selection.getAvailableProviders(),
          models: yield* selection.getAvailableModels("live-provider"),
          selected: yield* selection.selectForTask(["analysis", "reasoning", "tool-use"]),
        }
      }).pipe(Effect.provide(layer)),
    )

    expect(result.providers).toEqual(["live-provider"])
    expect(result.models).toEqual(["deep-reasoner-code"])
    expect(result.selected).toMatchObject({
      providerID: "live-provider",
      modelID: "deep-reasoner-code",
    })
  })
})
