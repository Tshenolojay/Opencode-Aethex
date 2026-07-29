import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { ExecutionAdvisor } from "../intelligence/execution-advisor"
import { ReasoningBuilder } from "../reasoning/reasoning-builder"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/planning",
  name: "Planning Specialist",
  description: "Breaks down complex tasks into sub-tasks and plans execution order",
  purpose: "Create execution plan for multi-step tasks",
  mission: "Design optimal execution plans that maximize parallel work and minimize dependencies",
  primaryObjective: "Produce a complete task breakdown with execution order, dependencies, and resource allocation",
  responsibilities: "Task decomposition, execution ordering, dependency resolution, resource allocation, risk assessment",
  requiredCapabilities: ["planning", "reasoning", "analysis"],
  preferredKnowledge: ["repository-summary", "architecture-summary", "relevant-files", "conversation-summary"],
  knowledgeSources: ["task-requirements", "architecture-context", "specialist-capabilities"],
  executionPriority: 1,
  supportsParallelExecution: false,
  contract: {
    requires: ["planning", "reasoning"],
    consumes: ["repository-summary", "architecture-summary"],
    produces: ["execution-plan", "task-breakdown"],
    provides: ["task-graph", "execution-order", "risk-assessment", "resource-plan"],
    validates: ["plan-feasibility"],
    reviews: ["plan-quality"],
    approves: ["execution-plan"],
    dependsOn: ["repository-understanding", "architecture-understanding"],
    canExecuteInParallel: false, canExecuteSequentially: true,
    canSkip: false, canReuse: true, canRetry: true, canEscalate: true,
  },
  lifecycle: {
    planning: ["assess-input", "determine-approach"],
    preparation: ["load-required-knowledge", "prepare-context"],
    execution: ["perform-analysis", "collect-findings"],
    validation: ["validate-findings", "cross-reference-sources"],
    knowledgeProduction: ["produce-summary", "produce-notes"],
    review: ["submit-for-review"],
    completion: ["finalize-output", "tag-for-reuse"],
    reuse: ["check-cached-output"],
    recovery: ["retry-with-adjusted-parameters"],
    cancellation: ["abort-analysis", "cleanup"],
    failure: ["log-failure", "return-error-summary"],
    timeout: ["return-partial-findings"],
  },
  decisionRules: {
    canRecommendContinue: true, canRecommendRetry: true, canRecommendEscalate: true,
    canRecommendStop: false, canRecommendCollectMoreKnowledge: true,
    canRecommendReduceContext: false, canRecommendExpandContext: true,
    canRecommendRunVerification: true, canRecommendRunDocumentationReview: false,
    canRecommendRunArchitectureReview: false, canRecommendRunDependencyReview: false,
    canRecommendRunSearch: true, canRecommendRunPlanning: false,
  },
  modelRequirements: {
    preferredReasoningModel: "reasoning", preferredSearchModel: undefined,
    preferredLongContextModel: "long-context", preferredFastModel: undefined,
    preferredCheapModel: undefined, preferredMultimodalModel: undefined,
    preferredLatencyMs: undefined, preferredCostPerToken: undefined,
    preferredQualityScore: 0.85, preferredContextTokens: 16000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: false, requiresPlanning: true,
  },
  expertise: ["task-decomposition", "execution-ordering", "dependency-resolution", "risk-assessment", "resource-planning"],
  produces: ["execution-plan", "task-breakdown", "risk-report"],
  consumes: ["repository-summary", "architecture-summary", "conversation-summary"],
  requires: ["repository-understanding", "architecture-understanding"],
  preferredCapabilities: ["planning", "reasoning", "analysis"],
  optionalCapabilities: ["long-context"], secondaryCapabilities: ["search"],
  fallbackCapabilities: ["reasoning"],
  specialistStrengths: ["complex-task-decomposition", "parallel-execution-optimization", "dependency-detection"],
  specialistWeaknesses: ["uncertainty-quantification", "resource-estimation"],
  specialistPreferences: ["top-down-decomposition", "dependency-first-ordering"],
  maximumContext: 8000, priorityWeight: 1.0, confidenceWeight: 0.8,
  executionCost: 3, expectedRuntimeMs: 5000,
  recoveryStrategy: "fallback-to-sequential-plan",
  retryPolicy: "exponential-backoff-max-2", timeoutPolicy: "return-partial-plan",
  maxRetries: 2, timeoutMs: 30000,
  reviewRequirements: ["planning-review"],
  reviewResponsibilities: ["plan-integrity"],
  approvalRequirements: ["plan-approval-required"],
  memoryRequirements: ["cache-execution-plan", "session-scoped"],
  cachePolicy: "ttl-600s-session-scoped",
  collaborationRules: ["receive-foundation-from-repository-and-architecture", "delegate-tasks-to-specialists", "report-plan-to-coordinator"],
  validationRules: ["validate-task-dependencies-are-resolvable", "check-plan-feasibility", "verify-resource-availability"],
  metrics: ["task-count", "parallelism-ratio", "plan-build-time", "dependency-depth"],
  diagnostics: ["decomposition-time", "ordering-time", "dependency-resolution-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["planning", "architecture", "code-generation", "refactor", "research"].includes(taskType)
}

export const make = Effect.fn("PlanningSpecialist.make")(function* () {
  const execute = Effect.fn("PlanningSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const advisor = yield* ExecutionAdvisor.Service
    const reasoningBuilder = yield* ReasoningBuilder.Service
    const startTime = Date.now()
    const collectedKnowledge: CollectedKnowledgeEntry[] = []
    const warnings: string[] = []
    const errors: string[] = []

    if (execInput.executionPackage) {
      const intelligence = yield* advisor.advise(execInput.executionPackage)
      const reasoningReport = yield* reasoningBuilder.build(execInput.executionPackage)

      if (intelligence.executionRecommendations) {
        for (const rec of intelligence.executionRecommendations) {
          collectedKnowledge.push({
            type: `recommendation:${rec.category}`,
            content: rec.recommendation,
            source: profile.id,
            confidence: rec.priority === "high" ? 0.8 : rec.priority === "medium" ? 0.6 : 0.4,
            timestamp: startTime,
          })
        }
      }

      if (intelligence.executionRisks) {
        for (const risk of intelligence.executionRisks) {
          warnings.push(`Risk (${risk.severity}): ${risk.risk}`)
        }
      }

      if (reasoningReport.reasoningSummary) {
        collectedKnowledge.push({
          type: "reasoning-summary",
          content: reasoningReport.reasoningSummary,
          source: profile.id,
          confidence: reasoningReport.reasoningConfidence,
          timestamp: startTime,
        })
      }
    }

    const confidence = collectedKnowledge.length > 0 ? Math.min(0.5 + collectedKnowledge.length * 0.1, 0.85) : 0.3
    const endTime = Date.now()

    const result: SpecialistResult = {
      specialistID: profile.id,
      specialistName: profile.name,
      executionTime: endTime - startTime,
      startTime, endTime, confidence,
      capabilitiesUsed: profile.requiredCapabilities,
      collectedKnowledge,
      contextUsed: `Planning context prepared from ${collectedKnowledge.length} knowledge entries`,
      modelCandidate: undefined,
      warnings: warnings.length > 0 ? warnings : collectedKnowledge.length === 0 ? ["Insufficient knowledge for planning"] : [],
      errors,
      metadata: { executionPhase: "specialist-execution", intelligenceType: "planning" },
    }
    return result
  })

  const review = (result: SpecialistResult): Effect.Effect<ReviewVerdict> =>
    Effect.succeed(
      result.collectedKnowledge.length === 0 ? "needs-escalation" as const :
      result.confidence < 0.3 ? "changes-requested" as const :
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
