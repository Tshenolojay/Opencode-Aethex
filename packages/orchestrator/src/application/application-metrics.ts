export * as ApplicationMetrics from "./application-metrics"

import { Context, Effect, Layer, Ref } from "effect"

export interface ApplicationMetricsData {
  readonly analysisCount: number
  readonly workflowAnalysisCount: number
  readonly featureAnalysisCount: number
  readonly businessAnalysisCount: number
  readonly domainAnalysisCount: number
  readonly summaryGenerationCount: number
  readonly memoryReuseCount: number
  readonly understandingConfidence: number
}

export interface Interface {
  readonly recordAnalysis: () => Effect.Effect<void>
  readonly recordWorkflowAnalysis: () => Effect.Effect<void>
  readonly recordFeatureAnalysis: () => Effect.Effect<void>
  readonly recordBusinessAnalysis: () => Effect.Effect<void>
  readonly recordDomainAnalysis: () => Effect.Effect<void>
  readonly recordSummaryGeneration: () => Effect.Effect<void>
  readonly recordMemoryReuse: () => Effect.Effect<void>
  readonly updateConfidence: (confidence: number) => Effect.Effect<void>
  readonly get: Effect.Effect<ApplicationMetricsData>
  readonly reset: Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationMetrics") {}

function zero(): ApplicationMetricsData {
  return {
    analysisCount: 0,
    workflowAnalysisCount: 0,
    featureAnalysisCount: 0,
    businessAnalysisCount: 0,
    domainAnalysisCount: 0,
    summaryGenerationCount: 0,
    memoryReuseCount: 0,
    understandingConfidence: 0,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<ApplicationMetricsData>(zero())

    const record = (fn: (d: ApplicationMetricsData) => ApplicationMetricsData) =>
      Ref.update(store, fn)

    const recordAnalysis = Effect.fn("ApplicationMetrics.recordAnalysis")(function* () {
      yield* record((d) => ({ ...d, analysisCount: d.analysisCount + 1 }))
    })

    const recordWorkflowAnalysis = Effect.fn("ApplicationMetrics.recordWorkflowAnalysis")(function* () {
      yield* record((d) => ({ ...d, workflowAnalysisCount: d.workflowAnalysisCount + 1 }))
    })

    const recordFeatureAnalysis = Effect.fn("ApplicationMetrics.recordFeatureAnalysis")(function* () {
      yield* record((d) => ({ ...d, featureAnalysisCount: d.featureAnalysisCount + 1 }))
    })

    const recordBusinessAnalysis = Effect.fn("ApplicationMetrics.recordBusinessAnalysis")(function* () {
      yield* record((d) => ({ ...d, businessAnalysisCount: d.businessAnalysisCount + 1 }))
    })

    const recordDomainAnalysis = Effect.fn("ApplicationMetrics.recordDomainAnalysis")(function* () {
      yield* record((d) => ({ ...d, domainAnalysisCount: d.domainAnalysisCount + 1 }))
    })

    const recordSummaryGeneration = Effect.fn("ApplicationMetrics.recordSummaryGeneration")(function* () {
      yield* record((d) => ({ ...d, summaryGenerationCount: d.summaryGenerationCount + 1 }))
    })

    const recordMemoryReuse = Effect.fn("ApplicationMetrics.recordMemoryReuse")(function* () {
      yield* record((d) => ({ ...d, memoryReuseCount: d.memoryReuseCount + 1 }))
    })

    const updateConfidence = Effect.fn("ApplicationMetrics.updateConfidence")(function* (confidence) {
      yield* Ref.update(store, (d) => ({ ...d, understandingConfidence: confidence }))
    })

    return Service.of({
      recordAnalysis, recordWorkflowAnalysis, recordFeatureAnalysis,
      recordBusinessAnalysis, recordDomainAnalysis, recordSummaryGeneration,
      recordMemoryReuse, updateConfidence,
      get: Ref.get(store),
      reset: Ref.set(store, zero()),
    })
  }),
)

export { layer }
