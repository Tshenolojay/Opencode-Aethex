import { Effect } from "effect"
import type { KnowledgeBundle, SearchResult } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import type { KnowledgeSourceType } from "../integration/execution-package"
import { KnowledgeConnector } from "../connectors/knowledge-connector"
import { KnowledgeSourceRegistry } from "../connectors/knowledge-source-registry"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/search",
  name: "Search Specialist",
  description: "Searches the codebase for relevant files, symbols, and patterns",
  purpose: "Find relevant code and documentation during discovery phase",
  mission: "Efficiently locate all relevant code locations for any given query",
  primaryObjective: "Produce a comprehensive set of file paths and symbol references matching the query intent",
  responsibilities: "Codebase search, symbol resolution, pattern matching, relevance ranking",
  requiredCapabilities: ["search", "repository-understanding"],
  preferredKnowledge: ["repository-summary", "relevant-files", "search-results", "project-structure"],
  knowledgeSources: ["repository-filesystem", "symbol-index", "search-engine"],
  executionPriority: 2,
  supportsParallelExecution: true,
  contract: {
    requires: ["repository-understanding"],
    consumes: ["search-query"],
    produces: ["search-results", "relevant-files"],
    provides: ["file-references", "symbol-locations"],
    validates: ["result-relevance"],
    reviews: ["search-result-quality"],
    approves: [],
    dependsOn: ["repository-understanding"],
    canExecuteInParallel: true, canExecuteSequentially: true,
    canSkip: false, canReuse: true, canRetry: true, canEscalate: true,
  },
  lifecycle: {
    planning: ["identify-search-targets", "determine-scope"],
    preparation: ["load-search-indices", "prepare-queries"],
    execution: ["perform-codebase-search", "collect-results"],
    validation: ["validate-result-relevance", "deduplicate-results"],
    knowledgeProduction: ["produce-search-results", "produce-relevant-files"],
    review: ["present-findings-for-review"],
    completion: ["finalize-search-results", "tag-for-reuse"],
    reuse: ["check-cached-search-results"],
    recovery: ["retry-with-broader-query"],
    cancellation: ["abort-search", "cleanup-temporary-indices"],
    failure: ["log-search-failure", "return-partial-results"],
    timeout: ["return-partial-results", "suggest-broader-search"],
  },
  decisionRules: {
    canRecommendContinue: true, canRecommendRetry: true, canRecommendEscalate: true,
    canRecommendStop: false, canRecommendCollectMoreKnowledge: true,
    canRecommendReduceContext: false, canRecommendExpandContext: true,
    canRecommendRunVerification: true, canRecommendRunDocumentationReview: false,
    canRecommendRunArchitectureReview: false, canRecommendRunDependencyReview: false,
    canRecommendRunSearch: false, canRecommendRunPlanning: false,
  },
  modelRequirements: {
    preferredReasoningModel: undefined, preferredSearchModel: "fast-search",
    preferredLongContextModel: undefined, preferredFastModel: "fast-response",
    preferredCheapModel: "cheap", preferredMultimodalModel: undefined,
    preferredLatencyMs: 500, preferredCostPerToken: 0.1,
    preferredQualityScore: 0.7, preferredContextTokens: 4000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: true, requiresPlanning: false,
  },
  expertise: ["pattern-matching", "code-search", "symbol-resolution", "relevance-ranking"],
  produces: ["search-results", "relevant-files", "symbol-references"],
  consumes: ["search-query", "repository-structure"],
  requires: ["repository-access"],
  preferredCapabilities: ["search", "repository-understanding"],
  optionalCapabilities: ["fast-response", "cheap"],
  secondaryCapabilities: ["analysis"],
  fallbackCapabilities: ["reasoning"],
  specialistStrengths: ["fast-file-discovery", "pattern-matching", "large-repository-navigation"],
  specialistWeaknesses: ["deep-semantic-understanding", "cross-repository-search"],
  specialistPreferences: ["batched-search", "priority-by-file-type"],
  maximumContext: 4000, priorityWeight: 0.8, confidenceWeight: 0.7,
  executionCost: 1, expectedRuntimeMs: 2000,
  recoveryStrategy: "broaden-query-and-retry",
  retryPolicy: "exponential-backoff-max-3", timeoutPolicy: "return-partial-and-continue",
  maxRetries: 3, timeoutMs: 10000,
  reviewRequirements: ["peer-review-of-results"],
  reviewResponsibilities: ["search-quality"],
  approvalRequirements: [], memoryRequirements: ["cache-search-results", "session-scoped"],
  cachePolicy: "ttl-300s-session-scoped",
  collaborationRules: ["share-results-with-repository-specialist", "accept-broader-query-from-planner"],
  validationRules: ["validate-file-exists", "validate-symbol-resolves", "deduplicate-results"],
  metrics: ["search-latency", "result-count", "relevance-score", "cache-hit-rate"],
  diagnostics: ["query-parsing-time", "search-index-load-time", "result-ranking-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["code-search", "research", "dependency-management", "debug"].includes(taskType)
}

export const make = Effect.fn("SearchSpecialist.make")(function* () {
  const execute = Effect.fn("SearchSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const connector = yield* KnowledgeConnector.Service
    const sourceRegistry = yield* KnowledgeSourceRegistry.Service
    const startTime = Date.now()
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    const searchSourceTypes: KnowledgeSourceType[] = ["repository", "documentation", "conversation", "tool-history"]
    const available = yield* sourceRegistry.discover(searchSourceTypes)

    for (const source of available) {
      const result = yield* connector.request({
        sourceType: source.type,
        specialistID: profile.id,
        filters: { taskType: execInput.taskType, objective: execInput.taskObjective },
      })
      if (result.status === "prepared") {
        collectedKnowledge.push({
          type: `connector:${result.sourceType}`,
          content: JSON.stringify(result.metadata),
          source: profile.id,
          confidence: result.confidence,
          timestamp: startTime,
        })
      }
    }

    const confidence = collectedKnowledge.length > 0 ? Math.min(0.5 + collectedKnowledge.length * 0.1, 0.9) : 0.3
    const endTime = Date.now()

    const result: SpecialistResult = {
      specialistID: profile.id,
      specialistName: profile.name,
      executionTime: endTime - startTime,
      startTime, endTime, confidence,
      capabilitiesUsed: profile.requiredCapabilities,
      collectedKnowledge,
      contextUsed: `Search produced ${collectedKnowledge.length} knowledge entries from ${available.length} sources`,
      modelCandidate: undefined,
      warnings: collectedKnowledge.length === 0 ? ["No search results found from any knowledge source"] : [],
      errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "search" },
    }
    return result
  })

  const review = (result: SpecialistResult): Effect.Effect<ReviewVerdict> =>
    Effect.succeed(
      result.warnings.length > 0 ? "changes-requested" as const :
      result.confidence < 0.3 ? "needs-escalation" as const :
      "approved" as const
    )

  const validate = (result: SpecialistResult): Effect.Effect<ValidationResult> =>
    Effect.succeed({
      entries: result.collectedKnowledge.map((entry) => ({
        specialistID: profile.id,
        sourceEntry: entry,
        status: entry.confidence >= 0.4 ? "valid" as const : "uncertain" as const,
        confidence: entry.confidence,
        issues: entry.confidence < 0.4 ? ["low confidence"] : [],
        evidence: [],
      })),
      validCount: result.collectedKnowledge.filter((e) => e.confidence >= 0.4).length,
      invalidCount: 0,
      uncertainCount: result.collectedKnowledge.filter((e) => e.confidence < 0.4).length,
      rejectedEntries: result.collectedKnowledge.filter((e) => e.confidence < 0.2),
    })

  const specialist: BaseSpecialistInterface = {
    id: profile.id,
    profile,
    execute, review, validate,
    canHandle,
    getContract: () => profile.contract,
    getLifecycle: () => profile.lifecycle!,
    getDecisionRules: () => profile.decisionRules!,
    getModelRequirements: () => profile.modelRequirements!,
  }

  const registry = yield* SpecialistRegistry.Service
  yield* registry.registerSpecialist(specialist)

  return specialist
})
