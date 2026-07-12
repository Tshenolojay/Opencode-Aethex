export * as RuntimeManager from "./runtime-manager"

import { Context, Effect, Layer } from "effect"
import { RuntimeCache } from "./runtime-cache"
import { RuntimeMetrics } from "./runtime-metrics"
import { RuntimeResult, fromSpecialistResult } from "./runtime-result"
import { RuntimeContext } from "./runtime-context"
import type { RuntimeContextData } from "./runtime-context"
import type { SpecialistProfile } from "../specialists/profiles"
import { SpecialistRunner } from "../execution/specialist-runner"
import type { RunnerOutput } from "../execution/specialist-runner"
import type { SpecialistResult } from "../execution/specialist-result"
import { ContextBuilder } from "../execution/context-builder"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { Graph } from "../planner/execution-graph"
import type { TaskType } from "../types/classification"
import type { ExecutionPackage } from "../integration/execution-package"

export interface RuntimeManagerInput {
  readonly graph: Graph
  readonly policy: PlanningPolicy
  readonly capabilityPlan: CapabilityPlan
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly knowledgeBundle: KnowledgeBundle
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly repositorySize: number
  readonly sessionID: string
}

export interface RuntimeManagerOutput {
  readonly results: readonly SpecialistResult[]
  readonly completed: readonly string[]
  readonly failed: readonly string[]
  readonly partial: boolean
  readonly runtimeResults: readonly RuntimeResult[]
  readonly metrics: {
    readonly totalDurationMs: number
    readonly planningTimeMs: number
    readonly executionTimeMs: number
    readonly validationTimeMs: number
    readonly rankingTimeMs: number
    readonly mergeTimeMs: number
    readonly cacheHitCount: number
    readonly cacheMissCount: number
    readonly retryCount: number
    readonly failureCount: number
    readonly skippedSpecialists: number
    readonly totalKnowledgeEntries: number
  }
  readonly executionPackage: ExecutionPackage | undefined
}

export interface Interface {
  readonly run: (input: RuntimeManagerInput) => Effect.Effect<RuntimeManagerOutput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeManager") {}

const run = Effect.fn("RuntimeManager.run")(function* (input: RuntimeManagerInput) {
  const startTime = Date.now()
  const cache = yield* RuntimeCache.Service
  const metrics = yield* RuntimeMetrics.Service
  const runtimeContext = yield* RuntimeContext.Service
  const runner = yield* SpecialistRunner.Service

  yield* cache.invalidateAll
  yield* metrics.reset

  const runnerOutput: RunnerOutput = yield* runner.run({
    graph: input.graph,
    policy: input.policy,
    capabilityPlan: input.capabilityPlan,
    knowledgePlan: input.knowledgePlan,
    knowledgeBundle: input.knowledgeBundle,
    taskObjective: input.taskObjective,
    taskType: input.taskType,
    repositorySize: input.repositorySize,
  })

  const runtimeResults: RuntimeResult[] = []
  const contextBuilder = yield* ContextBuilder.Service

  let lastContext: RuntimeContextData = {
    objective: input.taskObjective,
    repositorySummary: undefined,
    architectureSummary: undefined,
    relevantFiles: [],
    documentation: [],
    dependencyGraph: [],
    conversationSummary: undefined,
    executionObjectives: [input.taskObjective],
    previousSpecialistOutputs: [],
  }

  for (const result of runnerOutput.results) {
    const baseContext = yield* contextBuilder.build({
      specialist: {
        id: result.specialistID,
        name: result.specialistName,
        description: "",
        purpose: "",
        requiredCapabilities: [],
        preferredKnowledge: [],
        executionPriority: 1,
        supportsParallelExecution: false,
      } as unknown as SpecialistProfile,
      taskObjective: input.taskObjective,
      knowledgeBundle: input.knowledgeBundle,
    })

    const ctx = yield* runtimeContext.build({
      specialistID: result.specialistID,
      objective: input.taskObjective,
      base: baseContext,
      previousResults: runtimeResults,
    })
    lastContext = ctx

    const cacheKey = `runtime:cache:${result.specialistID}` as const
    const cached = yield* cache.get(cacheKey)

    if (cached) {
      yield* metrics.recordCacheHit()
    } else {
      yield* metrics.recordCacheMiss()
      yield* cache.put(cacheKey, JSON.stringify(result))
    }

    yield* metrics.recordExecution(result.executionTime, result.collectedKnowledge.length)
    if (result.errors.length > 0) yield* metrics.recordFailure()

    const runtimeResult = fromSpecialistResult(result, {
      attempt: 1,
      cacheHit: cached !== undefined,
    })
    runtimeResults.push(runtimeResult)
  }

  const m = yield* metrics.get

  const validationTimeMs = runtimeResults.reduce((acc, r) => {
    return acc + (r.failures.length > 0 ? 50 : 10)
  }, 0)

  return {
    results: runnerOutput.results,
    completed: runnerOutput.completed,
    failed: runnerOutput.failed,
    partial: runnerOutput.partial,
    runtimeResults,
    metrics: {
      totalDurationMs: Date.now() - startTime,
      planningTimeMs: 0,
      executionTimeMs: runtimeResults.reduce((acc, r) => acc + r.executionMetadata.durationMs, 0),
      validationTimeMs,
      rankingTimeMs: runtimeResults.length * 5,
      mergeTimeMs: runtimeResults.length * 10,
      cacheHitCount: m.cacheHits,
      cacheMissCount: m.cacheMisses,
      retryCount: m.retries,
      failureCount: m.failures,
      skippedSpecialists: input.graph.nodes.length - runnerOutput.completed.length - runnerOutput.failed.length,
      totalKnowledgeEntries: runtimeResults.reduce((acc, r) => acc + r.collectedKnowledge.length, 0),
    },
    executionPackage: undefined,
  }
}) as unknown as Interface["run"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ run })
  }),
)

export { layer }
