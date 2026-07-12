export * as PlanningMemory from "./planning-memory"

import { Context, Effect, Layer, Ref } from "effect"
import type { SpecialistProfile, SpecialistMatch } from "../specialists/registry"
import type { CapabilityPlan } from "./capability-planner"
import type { KnowledgePlan, KnowledgeRequest } from "./knowledge-planner"
import type { Graph as ExecutionGraph } from "./execution-graph"
import type { PlanningPolicy } from "./planning-policy"
import type { SpecialistResult } from "../execution/specialist-result"
import type { ExecutionPackage } from "../integration/execution-package"

export type SummaryDomain =
  | "repository"
  | "architecture"
  | "dependency"
  | "documentation"
  | "verification"
  | "planning"
  | "workflow"
  | "reasoning"
  | "team-discussion"

export interface CachedSummary {
  readonly content: string
  readonly cachedAt: number
  readonly validForMs: number
  readonly reuseCount: number
}

export interface PlanningMemoryData {
  readonly sessionID: string
  readonly startTime: number
  readonly specialistPlan: SpecialistPlanData | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly executionGraph: ExecutionGraph | undefined
  readonly policy: PlanningPolicy | undefined
  readonly completedRequests: readonly KnowledgeRequest[]
  readonly failedRequests: readonly KnowledgeRequest[]
  readonly errors: readonly string[]
  readonly completedSpecialists: readonly SpecialistResult[]
  readonly failedSpecialists: readonly { readonly id: string; readonly error: string }[]
  readonly retryHistory: readonly { readonly id: string; readonly attempts: number }[]
  readonly executionMetrics: Readonly<Record<string, number>>
  readonly reusableKnowledge: readonly string[]
  readonly cachedExecutionPackage: ExecutionPackage | undefined
  readonly executionPackageReuseCount: number
  readonly summaryCache: Readonly<Record<string, string>>
  readonly domainSummaryCache: Readonly<Record<string, CachedSummary>>
  readonly reusedSummaryCount: number
  readonly knowledgeReuseSavings: number
  readonly planningReuseCount: number
  readonly collaborationOutcomes: readonly {
    readonly specialistIDs: readonly string[]
    readonly outcome: "resolved" | "escalated" | "pending"
    readonly timestamp: number
  }[]
  readonly specialistDecisions: readonly {
    readonly specialistID: string
    readonly decision: string
    readonly confidence: number
  }[]
  readonly approvals: readonly {
    readonly specialistID: string
    readonly approvedBy: string
    readonly status: "approved" | "rejected"
  }[]
  readonly escalations: readonly {
    readonly fromSpecialist: string
    readonly reason: string
    readonly resolved: boolean
  }[]
}

export interface ReuseStats {
  readonly reusedSummaryCount: number
  readonly knowledgeReuseSavings: number
  readonly planningReuseCount: number
}

export interface SpecialistPlanData {
  readonly selected: readonly SpecialistMatch[]
  readonly executionOrder: readonly string[]
  readonly parallelGroups: readonly string[][]
  readonly dependencies: readonly { from: string; to: string }[]
}

export interface Interface {
  readonly initialize: (sessionID: string) => Effect.Effect<void>
  readonly get: Effect.Effect<PlanningMemoryData>
  readonly updateSpecialistPlan: (plan: SpecialistPlanData) => Effect.Effect<void>
  readonly updateCapabilityPlan: (plan: CapabilityPlan) => Effect.Effect<void>
  readonly updateKnowledgePlan: (plan: KnowledgePlan) => Effect.Effect<void>
  readonly updateExecutionGraph: (graph: ExecutionGraph) => Effect.Effect<void>
  readonly updatePolicy: (policy: PlanningPolicy) => Effect.Effect<void>
  readonly completeRequest: (requestID: string) => Effect.Effect<void>
  readonly failRequest: (requestID: string) => Effect.Effect<void>
  readonly addError: (error: string) => Effect.Effect<void>
  readonly completeSpecialist: (result: SpecialistResult) => Effect.Effect<void>
  readonly failSpecialist: (id: string, error: string) => Effect.Effect<void>
  readonly recordRetry: (id: string, attempts: number) => Effect.Effect<void>
  readonly recordMetric: (key: string, value: number) => Effect.Effect<void>
  readonly addReusableKnowledge: (knowledge: string) => Effect.Effect<void>
  readonly findReusableKnowledge: (specialistID: string) => Effect.Effect<readonly string[]>
  readonly hasSpecialistRun: (specialistID: string) => Effect.Effect<boolean>
  readonly getPreviousKnowledgeForType: (knowledgeType: string) => Effect.Effect<readonly string[]>
  readonly cacheExecutionPackage: (pkg: ExecutionPackage) => Effect.Effect<void>
  readonly getCachedExecutionPackage: Effect.Effect<ExecutionPackage | undefined>
  readonly getExecutionPackageReuseCount: Effect.Effect<number>
  readonly cacheSummary: (type: string, content: string) => Effect.Effect<void>
  readonly getSummary: (type: string) => Effect.Effect<string | undefined>
  readonly recordReuse: (type: string) => Effect.Effect<void>
  readonly recordReuseSavings: (bytes: number) => Effect.Effect<void>
  readonly recordPlanningReuse: () => Effect.Effect<void>
  readonly getReuseStats: Effect.Effect<ReuseStats>
  readonly cacheDomainSummary: (domain: SummaryDomain, content: string, validForMs: number) => Effect.Effect<void>
  readonly getDomainSummary: (domain: SummaryDomain) => Effect.Effect<string | undefined>
  readonly isDomainSummaryValid: (domain: SummaryDomain) => Effect.Effect<boolean>
  readonly getDomainCachedAt: (domain: SummaryDomain) => Effect.Effect<number | undefined>
  readonly clearStaleDomainSummaries: Effect.Effect<number>
  readonly reset: Effect.Effect<void>
  readonly recordCollaborationOutcome: (
    outcome: PlanningMemoryData["collaborationOutcomes"][number]
  ) => Effect.Effect<void>
  readonly recordSpecialistDecision: (
    decision: PlanningMemoryData["specialistDecisions"][number]
  ) => Effect.Effect<void>
  readonly recordApproval: (
    approval: PlanningMemoryData["approvals"][number]
  ) => Effect.Effect<void>
  readonly recordEscalation: (
    escalation: PlanningMemoryData["escalations"][number]
  ) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PlanningMemory") {}

function initial(sessionID: string): PlanningMemoryData {
  return {
    sessionID,
    startTime: Date.now(),
    specialistPlan: undefined,
    capabilityPlan: undefined,
    knowledgePlan: undefined,
    executionGraph: undefined,
    policy: undefined,
    completedRequests: [],
    failedRequests: [],
    errors: [],
    completedSpecialists: [],
    failedSpecialists: [],
    retryHistory: [],
    executionMetrics: {},
    reusableKnowledge: [],
    cachedExecutionPackage: undefined,
    executionPackageReuseCount: 0,
    summaryCache: {},
    domainSummaryCache: {},
    reusedSummaryCount: 0,
    knowledgeReuseSavings: 0,
    planningReuseCount: 0,
    collaborationOutcomes: [],
    specialistDecisions: [],
    approvals: [],
    escalations: [],
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<PlanningMemoryData>(initial(""))

    const initialize = Effect.fn("PlanningMemory.initialize")(function* (sessionID: string) {
      const state = yield* Ref.get(store)
      if (state.sessionID === sessionID && state.startTime !== 0) return
      yield* Ref.set(store, initial(sessionID))
    })

    const get = Ref.get(store)

    const updateSpecialistPlan = Effect.fn("PlanningMemory.updateSpecialistPlan")(function* (plan: SpecialistPlanData) {
      yield* Ref.update(store, (s) => ({ ...s, specialistPlan: plan }))
    })

    const updateCapabilityPlan = Effect.fn("PlanningMemory.updateCapabilityPlan")(function* (plan: CapabilityPlan) {
      yield* Ref.update(store, (s) => ({ ...s, capabilityPlan: plan }))
    })

    const updateKnowledgePlan = Effect.fn("PlanningMemory.updateKnowledgePlan")(function* (plan: KnowledgePlan) {
      yield* Ref.update(store, (s) => ({ ...s, knowledgePlan: plan }))
    })

    const updateExecutionGraph = Effect.fn("PlanningMemory.updateExecutionGraph")(function* (graph: ExecutionGraph) {
      yield* Ref.update(store, (s) => ({ ...s, executionGraph: graph }))
    })

    const updatePolicy = Effect.fn("PlanningMemory.updatePolicy")(function* (policy: PlanningPolicy) {
      yield* Ref.update(store, (s) => ({ ...s, policy }))
    })

    const completeRequest = Effect.fn("PlanningMemory.completeRequest")(function* (requestID: string) {
      yield* Ref.update(store, (s) => {
        const request = s.knowledgePlan?.requests.find((r) => r.id === requestID)
        if (!request) return s
        const req = { ...request, status: "completed" as const }
        return {
          ...s,
          completedRequests: [...s.completedRequests, req as KnowledgeRequest],
        }
      })
    })

    const failRequest = Effect.fn("PlanningMemory.failRequest")(function* (requestID: string) {
      yield* Ref.update(store, (s) => {
        const request = s.knowledgePlan?.requests.find((r) => r.id === requestID)
        if (!request) return s
        const req = { ...request, status: "failed" as const }
        return {
          ...s,
          failedRequests: [...s.failedRequests, req as KnowledgeRequest],
        }
      })
    })

    const addError = Effect.fn("PlanningMemory.addError")(function* (error: string) {
      yield* Ref.update(store, (s) => ({ ...s, errors: [...s.errors, error] }))
    })

    const completeSpecialist = Effect.fn("PlanningMemory.completeSpecialist")(function* (result: SpecialistResult) {
      yield* Ref.update(store, (s) => ({
        ...s,
        completedSpecialists: [...s.completedSpecialists, result],
        reusableKnowledge: [...s.reusableKnowledge, ...result.collectedKnowledge.map((c) => c.content)],
      }))
    })

    const failSpecialist = Effect.fn("PlanningMemory.failSpecialist")(function* (id: string, error: string) {
      yield* Ref.update(store, (s) => ({
        ...s,
        failedSpecialists: [...s.failedSpecialists, { id, error }],
      }))
    })

    const recordRetry = Effect.fn("PlanningMemory.recordRetry")(function* (id: string, attempts: number) {
      yield* Ref.update(store, (s) => ({
        ...s,
        retryHistory: [...s.retryHistory.filter((r) => r.id !== id), { id, attempts }],
      }))
    })

    const recordMetric = Effect.fn("PlanningMemory.recordMetric")(function* (key: string, value: number) {
      yield* Ref.update(store, (s) => ({
        ...s,
        executionMetrics: { ...s.executionMetrics, [key]: value },
      }))
    })

    const addReusableKnowledge = Effect.fn("PlanningMemory.addReusableKnowledge")(function* (knowledge: string) {
      yield* Ref.update(store, (s) => ({
        ...s,
        reusableKnowledge: [...s.reusableKnowledge, knowledge],
      }))
    })

    const findReusableKnowledge = Effect.fn("PlanningMemory.findReusableKnowledge")(function* (specialistID: string) {
      const state = yield* Ref.get(store)
      const relevant = state.completedSpecialists
        .filter((r) => r.specialistID === specialistID)
        .flatMap((r) => r.collectedKnowledge.map((c) => c.content))
      return [...new Set([...relevant, ...state.reusableKnowledge])]
    })

    const hasSpecialistRun = Effect.fn("PlanningMemory.hasSpecialistRun")(function* (specialistID: string) {
      const state = yield* Ref.get(store)
      return state.completedSpecialists.some((r) => r.specialistID === specialistID)
    })

    const getPreviousKnowledgeForType = Effect.fn("PlanningMemory.getPreviousKnowledgeForType")(function* (knowledgeType: string) {
      const state = yield* Ref.get(store)
      return state.completedSpecialists
        .flatMap((r) => r.collectedKnowledge)
        .filter((k) => k.type === knowledgeType)
        .map((k) => k.content)
    })

    const cacheExecutionPackage = Effect.fn("PlanningMemory.cacheExecutionPackage")(function* (pkg: ExecutionPackage) {
      yield* Ref.update(store, (s) => ({
        ...s,
        cachedExecutionPackage: pkg,
        executionPackageReuseCount: s.executionPackageReuseCount + 1,
      }))
    })

    const getCachedExecutionPackage = Effect.map(
      Ref.get(store),
      (s) => s.cachedExecutionPackage,
    )

    const getExecutionPackageReuseCount = Effect.map(
      Ref.get(store),
      (s) => s.executionPackageReuseCount,
    )

    const cacheSummary = Effect.fn("PlanningMemory.cacheSummary")(function* (type: string, content: string) {
      yield* Ref.update(store, (s) => ({ ...s, summaryCache: { ...s.summaryCache, [type]: content } }))
    })

    const getSummary = (type: string) => Effect.map(
      Ref.get(store),
      (s) => s.summaryCache[type],
    )

    const recordReuse = Effect.fn("PlanningMemory.recordReuse")(function* (type: string) {
      const exists = yield* Ref.get(store).pipe(Effect.map((s) => Boolean(s.summaryCache[type])))
      if (!exists) return
      yield* Ref.update(store, (s) => ({ ...s, reusedSummaryCount: s.reusedSummaryCount + 1 }))
    })

    const recordReuseSavings = Effect.fn("PlanningMemory.recordReuseSavings")(function* (bytes: number) {
      yield* Ref.update(store, (s) => ({ ...s, knowledgeReuseSavings: s.knowledgeReuseSavings + bytes }))
    })

    const recordPlanningReuse = Effect.fn("PlanningMemory.recordPlanningReuse")(function* () {
      yield* Ref.update(store, (s) => ({ ...s, planningReuseCount: s.planningReuseCount + 1 }))
    })

    const getReuseStats = Effect.map(
      Ref.get(store),
      (s): ReuseStats => ({
        reusedSummaryCount: s.reusedSummaryCount,
        knowledgeReuseSavings: s.knowledgeReuseSavings,
        planningReuseCount: s.planningReuseCount,
      }),
    )

    const cacheDomainSummary = Effect.fn("PlanningMemory.cacheDomainSummary")(
      function* (domain: SummaryDomain, content: string, validForMs: number) {
        yield* Ref.update(store, (s) => ({
          ...s,
          domainSummaryCache: {
            ...s.domainSummaryCache,
            [domain]: { content, cachedAt: Date.now(), validForMs, reuseCount: 0 },
          },
        }))
      },
    )

    const getDomainSummary = (domain: SummaryDomain) => Effect.map(
      Ref.get(store),
      (s) => s.domainSummaryCache[domain]?.content,
    )

    const isDomainSummaryValid = (domain: SummaryDomain) => Effect.map(
      Ref.get(store),
      (s) => {
        const entry = s.domainSummaryCache[domain]
        if (!entry) return false
        return Date.now() - entry.cachedAt < entry.validForMs
      },
    )

    const getDomainCachedAt = (domain: SummaryDomain) => Effect.map(
      Ref.get(store),
      (s) => s.domainSummaryCache[domain]?.cachedAt,
    )

    const clearStaleDomainSummaries = Effect.map(
      Ref.updateAndGet(store, (s) => {
        const now = Date.now()
        const remaining: Record<string, CachedSummary> = {}
        const cleared = Object.keys(s.domainSummaryCache).length
        for (const [key, entry] of Object.entries(s.domainSummaryCache)) {
          if (now - entry.cachedAt < entry.validForMs) {
            remaining[key] = { ...entry, reuseCount: entry.reuseCount + 1 }
          }
        }
        return { ...s, domainSummaryCache: remaining }
      }),
      (s) => Object.keys(s.domainSummaryCache)
        .filter((key) => Date.now() - s.domainSummaryCache[key].cachedAt >= s.domainSummaryCache[key].validForMs)
        .length,
    )

    const reset = Ref.set(store, initial(""))

    const recordCollaborationOutcome = Effect.fn("PlanningMemory.recordCollaborationOutcome")(
      function* (outcome: PlanningMemoryData["collaborationOutcomes"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, collaborationOutcomes: [...s.collaborationOutcomes, outcome] }))
      },
    )

    const recordSpecialistDecision = Effect.fn("PlanningMemory.recordSpecialistDecision")(
      function* (decision: PlanningMemoryData["specialistDecisions"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, specialistDecisions: [...s.specialistDecisions, decision] }))
      },
    )

    const recordApproval = Effect.fn("PlanningMemory.recordApproval")(
      function* (approval: PlanningMemoryData["approvals"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, approvals: [...s.approvals, approval] }))
      },
    )

    const recordEscalation = Effect.fn("PlanningMemory.recordEscalation")(
      function* (escalation: PlanningMemoryData["escalations"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, escalations: [...s.escalations, escalation] }))
      },
    )

    return Service.of({
      initialize, get, updateSpecialistPlan,
      updateCapabilityPlan, updateKnowledgePlan,
      updateExecutionGraph, updatePolicy,
      completeRequest, failRequest, addError,
      completeSpecialist, failSpecialist, recordRetry,
      recordMetric, addReusableKnowledge,
      findReusableKnowledge, hasSpecialistRun, getPreviousKnowledgeForType,
      cacheExecutionPackage, getCachedExecutionPackage, getExecutionPackageReuseCount,
      cacheSummary, getSummary, recordReuse, recordReuseSavings, recordPlanningReuse, getReuseStats,
      cacheDomainSummary, getDomainSummary, isDomainSummaryValid, getDomainCachedAt, clearStaleDomainSummaries,
      reset,
      recordCollaborationOutcome, recordSpecialistDecision, recordApproval, recordEscalation,
    })
  }),
)

export { layer }
