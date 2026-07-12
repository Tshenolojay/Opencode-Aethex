export * as ConnectorCoordinator from "./connector-coordinator"

import { Context, Effect, Layer, Ref } from "effect"
import type { ExecutionPackage, ConnectorPlan, ConnectorRequest, ConnectorResult, ConnectorMetadata, KnowledgeSourceType } from "../integration/execution-package"
import { KnowledgeSourceRegistry } from "./knowledge-source-registry"
import { RepositoryConnector } from "./repository-connector"
import { DocumentationConnector } from "./documentation-connector"
import { ConversationConnector } from "./conversation-connector"
import { ToolHistoryConnector } from "./tool-history-connector"
import { RuntimeMetrics } from "../runtime/runtime-metrics"

const CACHE_TTL_MS = 60_000

export interface ConnectorCacheEntry {
  readonly result: ConnectorResult
  readonly cachedAt: number
  readonly sourceKey: string
}

export interface Interface {
  readonly coordinate: (pkg: ExecutionPackage) => Effect.Effect<{
    readonly plan: ConnectorPlan
    readonly results: readonly ConnectorResult[]
    readonly metadata: ConnectorMetadata
  }>
  readonly clearCache: Effect.Effect<void>
  readonly getCacheSize: Effect.Effect<number>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConnectorCoordinator") {}

function determineNeededSources(pkg: ExecutionPackage): { required: KnowledgeSourceType[]; optional: KnowledgeSourceType[] } {
  const classification = pkg.taskClassification
  const required: KnowledgeSourceType[] = []
  const optional: KnowledgeSourceType[] = []

  required.push("repository")
  optional.push("documentation")
  optional.push("conversation")

  if (classification.requiresDependencyGraph) required.push("dependency")
  if (classification.requiresVerification) required.push("verification")
  if (classification.requiresSearch) optional.push("tool-history")
  if (classification.type === "refactoring" || classification.type === "code-generation") optional.push("architecture")

  return { required, optional }
}

function buildPlan(required: KnowledgeSourceType[], optional: KnowledgeSourceType[]): ConnectorPlan {
  const requests: ConnectorRequest[] = [
    ...required.map((t, i) => ({
      sourceType: t,
      specialistID: undefined as string | undefined,
      priority: i + 1,
      filters: undefined as Record<string, string> | undefined,
    })),
    ...optional.map((t, i) => ({
      sourceType: t,
      specialistID: undefined as string | undefined,
      priority: required.length + i + 1,
      filters: undefined as Record<string, string> | undefined,
    })),
  ]

  return {
    requests,
    totalPriority: requests.reduce((a, r) => a + r.priority, 0),
    hasRequiredSources: required.length > 0,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* KnowledgeSourceRegistry.Service
    const repoConnector = yield* RepositoryConnector.Service
    const docConnector = yield* DocumentationConnector.Service
    const convConnector = yield* ConversationConnector.Service
    const toolConnector = yield* ToolHistoryConnector.Service
    const metrics = yield* RuntimeMetrics.Service

    const cacheStore = yield* Ref.make<Map<string, ConnectorCacheEntry>>(new Map())

    function cacheKey(pkg: ExecutionPackage, sourceType: string): string {
      return `${sourceType}:${pkg.taskClassification.type}:${pkg.sessionID ?? "anon"}`
    }

    function isCacheValid(entry: ConnectorCacheEntry): boolean {
      return Date.now() - entry.cachedAt < CACHE_TTL_MS
    }

    const coordinate: Interface["coordinate"] = Effect.fn("ConnectorCoordinator.coordinate")(function* (pkg) {
      const tStart = Date.now()

      yield* registry.register({ type: "repository", description: "Repository file and structure analysis", capabilities: ["repository-understanding"], enabled: true })
      yield* registry.register({ type: "documentation", description: "Documentation content and references", capabilities: ["documentation"], enabled: true })
      yield* registry.register({ type: "conversation", description: "Session conversation history", capabilities: ["context"], enabled: true })
      yield* registry.register({ type: "tool-history", description: "Previous tool call outputs", capabilities: ["analysis"], enabled: true })

      const tPlan = Date.now()
      const { required, optional } = determineNeededSources(pkg)
      const plan = buildPlan(required, optional)
      const planTime = Date.now() - tPlan
      yield* metrics.recordConnectorPlanningTime(planTime)

      const tCoord = Date.now()
      const results: ConnectorResult[] = []
      let cacheHitCount = 0
      let cacheMissCount = 0
      let reuseCount = 0

      const connectorDispatch: Record<string, (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult>> = {
        repository: (p) => repoConnector.prepare(p),
        documentation: (p) => docConnector.prepare(p),
        conversation: (p) => convConnector.prepare(p),
        "tool-history": (p) => toolConnector.prepare(p),
      }

      for (const request of plan.requests) {
        const cache = yield* Ref.get(cacheStore)
        const key = cacheKey(pkg, request.sourceType)
        const cached = cache.get(key)

        if (cached && isCacheValid(cached)) {
          results.push(cached.result)
          cacheHitCount++
          yield* metrics.recordConnectorCacheHit()
          continue
        }

        if (cached && !isCacheValid(cached)) {
          cache.delete(key)
          yield* Ref.set(cacheStore, cache)
        }

        const dispatch = connectorDispatch[request.sourceType]
        if (!dispatch) {
          cacheMissCount++
          yield* metrics.recordConnectorCacheMiss()
          results.push({
            sourceType: request.sourceType,
            status: "missing",
            metadata: {},
            confidence: 0,
            error: "no connector registered",
          })
          continue
        }

        cacheMissCount++
        yield* metrics.recordConnectorCacheMiss()
        const result = yield* dispatch(pkg)

        if (result.status === "prepared" || result.status === "cached") {
          const updated = yield* Ref.get(cacheStore)
          updated.set(key, { result, cachedAt: Date.now(), sourceKey: key })
          yield* Ref.set(cacheStore, updated)
        }

        if (result.status === "cached") reuseCount++
        results.push(result)
      }

      const coordTime = Date.now() - tCoord
      yield* metrics.recordConnectorCoordinationTime(coordTime)

      if (reuseCount > 0) {
        yield* metrics.recordConnectorReuse()
      }

      const metadata: ConnectorMetadata = {
        plannerTimeMs: planTime,
        coordinatorTimeMs: coordTime,
        reuseCount,
        cacheHits: cacheHitCount,
        cacheMisses: cacheMissCount,
      }

      return { plan, results, metadata }
    })

    const clearCache = Ref.set(cacheStore, new Map())

    const getCacheSize = Effect.map(Ref.get(cacheStore), (c) => c.size)

    return Service.of({ coordinate, clearCache, getCacheSize })
  }),
)

export { layer }
