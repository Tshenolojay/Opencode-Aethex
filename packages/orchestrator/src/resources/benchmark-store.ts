export * as BenchmarkStore from "./benchmark-store"

import { Context, Effect, Layer, Ref } from "effect"
import type { Capability } from "../types/capability"

export interface BenchmarkResult {
  readonly providerID: string
  readonly modelID: string
  readonly capability: Capability
  readonly score: number
  readonly latencyMs: number
  readonly repositorySize: string | undefined
  readonly contextSize: number | undefined
  readonly success: boolean
  readonly timestamp: number
}

export interface ModelBenchmarkSummary {
  readonly providerID: string
  readonly modelID: string
  readonly capability: Capability
  readonly averageScore: number
  readonly averageLatencyMs: number
  readonly successRate: number
  readonly sampleCount: number
  readonly lastUpdated: number
}

export interface BenchmarkSnapshot {
  readonly summaries: ReadonlyMap<string, ModelBenchmarkSummary>
  readonly timestamp: number
}

export interface Interface {
  readonly record: (result: BenchmarkResult) => Effect.Effect<void>
  readonly getSummary: (providerID: string, modelID: string, capability: Capability) => Effect.Effect<ModelBenchmarkSummary | undefined>
  readonly getModelSummaries: (providerID: string, modelID: string) => Effect.Effect<readonly ModelBenchmarkSummary[]>
  readonly getBestForCapability: (capability: Capability) => Effect.Effect<ModelBenchmarkSummary | undefined>
  readonly snapshot: () => Effect.Effect<BenchmarkSnapshot>
  readonly reset: () => Effect.Effect<void>
}

function summaryKey(providerID: string, modelID: string, capability: Capability): string {
  return `${providerID}/${modelID}/${capability}`
}

function computeSummary(results: readonly BenchmarkResult[]): ModelBenchmarkSummary {
  const first = results[0]
  const successes = results.filter((r) => r.success)
  return {
    providerID: first.providerID,
    modelID: first.modelID,
    capability: first.capability,
    averageScore: results.reduce((a, r) => a + r.score, 0) / results.length,
    averageLatencyMs: results.reduce((a, r) => a + r.latencyMs, 0) / results.length,
    successRate: successes.length / results.length,
    sampleCount: results.length,
    lastUpdated: first.timestamp,
  }
}

const MAX_RESULTS_PER_KEY = 100

const make = Effect.gen(function* () {
  const resultsRef = yield* Ref.make<ReadonlyMap<string, readonly BenchmarkResult[]>>(new Map())

  const record = (result: BenchmarkResult) =>
    Ref.update(resultsRef, (prev) => {
      const key = summaryKey(result.providerID, result.modelID, result.capability)
      const existing = prev.get(key) ?? []
      const next = new Map(prev)
      const updated = [...existing, result].slice(-MAX_RESULTS_PER_KEY)
      next.set(key, updated)
      return next
    })

  const getSummary = (providerID: string, modelID: string, capability: Capability) =>
    Effect.map(Ref.get(resultsRef), (all) => {
      const key = summaryKey(providerID, modelID, capability)
      const results = all.get(key)
      if (!results || results.length === 0) return undefined
      return computeSummary(results)
    })

  const getModelSummaries = (providerID: string, modelID: string) =>
    Effect.map(Ref.get(resultsRef), (all) => {
      const summaries: ModelBenchmarkSummary[] = []
      for (const [key, results] of all) {
        if (key.startsWith(`${providerID}/${modelID}/`)) {
          summaries.push(computeSummary(results))
        }
      }
      return summaries
    })

  const getBestForCapability = (capability: Capability) =>
    Effect.map(Ref.get(resultsRef), (all) => {
      let best: ModelBenchmarkSummary | undefined
      for (const [key, results] of all) {
        if (key.endsWith(`/${capability}`)) {
          const summary = computeSummary(results)
          if (!best || summary.averageScore > best.averageScore) {
            best = summary
          }
        }
      }
      return best
    })

  const snapshot = () => Effect.map(Ref.get(resultsRef), (all) => {
    const summaries = new Map<string, ModelBenchmarkSummary>()
    for (const [key, results] of all) {
      summaries.set(key, computeSummary(results))
    }
    return { summaries, timestamp: Date.now() }
  })

  const reset = () => Ref.set(resultsRef, new Map())

  return Service.of({ record, getSummary, getModelSummaries, getBestForCapability, snapshot, reset })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/BenchmarkStore") {}

const layer = Layer.effect(Service, make)
export { layer }
