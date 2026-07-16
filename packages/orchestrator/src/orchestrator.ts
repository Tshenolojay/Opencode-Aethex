export * as OrchestratorService from "./orchestrator"

import { Context, Effect, Layer } from "effect"
import type { OrchestrationInput, OrchestrationDecision } from "./contracts/service"
import { TaskClassifier } from "./classifier/classifier"
import { ConfidenceEngine } from "./confidence/confidence"
import { SpecialistConversation } from "./session/specialist-conversation"
import { ExecutionBudget } from "./execution/execution-budget"
import { AgentDispatcher } from "./dispatcher/dispatcher"
import { ModelSelector } from "./selector/selector"
import { KnowledgeBundle } from "./knowledge/knowledge"
import type { KnowledgePlanMetadata } from "./knowledge/knowledge"
import type { ExecutionGraph as DispatchExecutionGraph } from "./types/dispatch"
import { TaskType } from "./types/classification"
import { ConfidenceLevel } from "./types/confidence"
import type { TimingInfo } from "./types/metadata"
import { CapabilityPlanner } from "./planner/capability-planner"
import { SpecialistRegistry } from "./specialists/registry"
import { KnowledgePlanner } from "./planner/knowledge-planner"
import { PlanningPolicy as PlanningPolicyService } from "./planner/planning-policy"
import { SpecialistRunner } from "./execution/specialist-runner"
import { KnowledgeCollector } from "./execution/knowledge-collector"
import { KnowledgeMerger } from "./execution/knowledge-merger"
import { RuntimeManager } from "./runtime/runtime-manager"
import { RuntimeContext } from "./runtime/runtime-context"
import { PromptBuilder } from "./prompts/prompt-builder"
import { RepositoryIntelligence } from "./intelligence/repository-intelligence"
import { ContextIntelligence } from "./intelligence/context-intelligence"
import { DependencyIntelligence } from "./intelligence/dependency-intelligence"
import { DocumentationIntelligence } from "./intelligence/documentation-intelligence"
import { ArchitectureIntelligence } from "./intelligence/architecture-intelligence"
import { VerificationIntelligence } from "./intelligence/verification-intelligence"
import { KnowledgeValidator } from "./intelligence/knowledge-validator"
import { RankingEngine } from "./intelligence/ranking-engine"
import type { ExecutionPackage } from "./integration/execution-package"
import { empty as emptyPackage } from "./integration/execution-package"
import { ExecutionPackageBuilder } from "./integration/execution-package-builder"
import { AgentContext as AgentContextService } from "./integration/agent-context"
import { AgentHints as AgentHintsService } from "./integration/agent-hints"
import { AgentCapabilities as AgentCapabilitiesService } from "./integration/agent-capabilities"
import { AgentSelectionAdvice as AgentSelectionAdviceService } from "./integration/agent-selection-advice"
import { PromptAugmentation as PromptAugmentationService } from "./integration/prompt-augmentation"
import { AgentEnhancer } from "./integration/agent-enhancer"
import { AgentAdapter } from "./integration/agent-adapter"
import { ApplicationProfile } from "./application/application-profile"
import { ApplicationRegistry } from "./application/application-registry"
import { ApplicationAnalyzer } from "./application/application-analyzer"
import { ApplicationCapabilities } from "./application/application-capabilities"
import { ApplicationWorkflows } from "./application/application-workflows"
import { ApplicationServices } from "./application/application-services"
import { ApplicationConnectors } from "./application/application-connectors"
import { ApplicationContext } from "./application/application-context"
import { ApplicationDiscovery } from "./application/application-discovery"
import { ApplicationIntelligence } from "./application/application-intelligence"
import { DomainIntelligence } from "./application/domain-intelligence"
import { BusinessIntelligence } from "./application/business-intelligence"
import { WorkflowIntelligence } from "./application/workflow-intelligence"
import { FeatureIntelligence } from "./application/feature-intelligence"
import { ModuleIntelligence } from "./application/module-intelligence"
import { ServiceIntelligence } from "./application/service-intelligence"
import { IntegrationIntelligence } from "./application/integration-intelligence"
import { OrganizationIntelligence } from "./application/organization-intelligence"
import { ApplicationMemory } from "./application/application-memory"
import { ApplicationSummaryEngine } from "./application/application-summary"
import { ApplicationHealth } from "./application/application-health"
import { ApplicationMetrics } from "./application/application-metrics"
import { ExecutionAdvisor } from "./intelligence/execution-advisor"
import { ContextCompressor } from "./intelligence/context-compressor"
import { RuntimeMetrics } from "./runtime/runtime-metrics"
import { ReasoningBuilder } from "./reasoning/reasoning-builder"
import { SpecialistConsensus } from "./reasoning/specialist-consensus"
import { ExecutionNarrative } from "./reasoning/execution-narrative"
import { DecisionEngine } from "./reasoning/decision-engine"
import { ReasoningMemory } from "./reasoning/reasoning-memory"
import { VirtualTeam } from "./team/virtual-team"
import { TaskDecomposer } from "./team/task-decomposer"
import { WorkAllocationEngine } from "./team/work-allocation"
import { TeamCoordinator } from "./team/team-coordinator"
import { TeamWorkspace } from "./team/workspace"
import { TeamDiscussionEngine } from "./team/team-discussion"
import { ReviewPipeline as ReviewPipelineService } from "./team/review-pipeline"
import { CapabilityMarketplace } from "./team/capability-marketplace"
import { ConnectorCoordinator } from "./connectors/connector-coordinator"
import { KnowledgeConnector } from "./connectors/knowledge-connector"
import { KnowledgeSourceRegistry } from "./connectors/knowledge-source-registry"
import { RepositoryConnector } from "./connectors/repository-connector"
import { DocumentationConnector } from "./connectors/documentation-connector"
import { ConversationConnector } from "./connectors/conversation-connector"
import { ToolHistoryConnector } from "./connectors/tool-history-connector"
import { ModelAssignment } from "./execution/model-assignment"
import { ContextBuilder } from "./execution/context-builder"
import { SpecialistExecutor } from "./execution/specialist-executor"
import { ExecutionScheduler } from "./execution/execution-scheduler"
import { FailureRecovery } from "./execution/recovery"
import { PlanningMemory } from "./planner/planning-memory"
import { ExecutionGraph as ExecutionGraphBuilder } from "./planner/execution-graph"
import { RuntimeCache } from "./runtime/runtime-cache"
import { RuntimeValidator } from "./runtime/runtime-validator"
import { RuntimeFallback } from "./runtime/runtime-fallback"
import { runAllStages, createInitialState } from "./pipeline/pipeline"
import { ExecutionSummaryView } from "./views/execution-summary-view"
import { RepositoryView } from "./views/repository-view"
import { ArchitectureView } from "./views/architecture-view"
import { DependencyView } from "./views/dependency-view"
import { DocumentationView } from "./views/documentation-view"
import { VerificationView } from "./views/verification-view"
import { ReasoningView } from "./views/reasoning-view"
import { PlanningView } from "./views/planning-view"
import { WorkflowView } from "./views/workflow-view"
import { ConnectorView } from "./views/connector-view"
import { Catalog } from "./catalog"
import { ModelCatalog } from "./model/model-catalog"
import { ProviderCatalog } from "./model/provider-catalog"
import { CapabilityRegistry } from "./model/capability-registry"
import { CapabilityDiscovery } from "./model/capability-discovery"
import { ModelDiscovery } from "./model/model-discovery"
import { ProviderRanking } from "./model/provider-ranking"
import { ModelRanking } from "./model/model-ranking"
import { SelectionCache } from "./model/selection-cache"
import { SelectionPolicies } from "./model/selection-policies"
import { ModelProfile } from "./model/model-profile"
import { ModelHealth } from "./model/model-health"
import { ModelCapabilities } from "./model/model-capabilities"
import { ModelRequirements } from "./model/model-requirements"
import { ProviderAdapter } from "./model/provider-adapter"
import { ProviderHealth } from "./model/provider-health"
import { FallbackStrategy } from "./model/fallback-strategy"
import { ExecutionStrategy } from "./model/execution-strategy"
import { CostEstimator } from "./model/cost-estimator"
import { LatencyEstimator } from "./model/latency-estimator"
import { ContextEstimator } from "./model/context-estimator"
import { LearningEngine } from "./learning/learning-engine"
import { DecisionHistory } from "./learning/decision-history"
import { StrategyEvaluator } from "./learning/strategy-evaluator"
import { WorkflowLearning } from "./learning/workflow-learning"
import { ConfidenceLearning } from "./learning/confidence-learning"
import { PlanningOptimizer } from "./learning/planning-optimizer"
import { KnowledgeFeedback } from "./learning/knowledge-feedback"
import { ExecutionFeedback } from "./learning/execution-feedback"
import { LearningMetrics } from "./learning/learning-metrics"
import { CollaborationPolicy } from "./collaboration/collaboration-policy"
import { ConsensusEngine } from "./collaboration/consensus-engine"
import { ConflictResolution } from "./collaboration/conflict-resolution"
import { DiscussionModerator } from "./collaboration/discussion-moderator"
import { PeerReviewEngine } from "./collaboration/peer-review-engine"
import { SharedWorkspace } from "./collaboration/shared-workspace"
import { SpecialistCoordinator } from "./collaboration/specialist-coordinator"
import { SpecialistScoreboard } from "./collaboration/specialist-scoreboard"
import { SpecialistMemory } from "./collaboration/specialist-memory"
import { ReviewManager } from "./collaboration/review-manager"
import { CollaborationSession as CollaborationSessionService } from "./collaboration/collaboration-session"
import { CollaborationEngine as CollaborationEngineService } from "./collaboration/collaboration-engine"
import * as CollaborationMetricsAggregator from "./collaboration/collaboration-metrics"
import { ProviderHealth as ResourceProviderHealth } from "./resources/provider-health"
import { ProviderAvailability } from "./resources/provider-availability"
import { BenchmarkStore } from "./resources/benchmark-store"
import { PerformanceMemory } from "./resources/performance-memory"
import { PreferenceManager } from "./resources/preference-manager"
import { ResourceEstimator } from "./resources/resource-estimator"
import { CapabilityMatcher } from "./resources/capability-matcher"
import { RoutingPolicy } from "./resources/routing-policy"
import { FallbackEngine } from "./resources/fallback-engine"
import { SelectionEngine } from "./resources/selection-engine"

export interface PhaseEntry {
  readonly phase: string
  readonly durationMs: number
  readonly result: string
  readonly error: string | undefined
}

export interface Interface {
  readonly orchestrate: (input: OrchestrationInput) => Effect.Effect<OrchestrationDecision>
  readonly orchestrateWithContext: (input: OrchestrationInput) => Effect.Effect<{
    readonly decision: OrchestrationDecision
    readonly timing: TimingInfo
    readonly diagnostics: readonly PhaseEntry[]
    readonly executionGraph: DispatchExecutionGraph | undefined
    readonly executionPackage: ExecutionPackage
  }>
  readonly skip: (input: OrchestrationInput) => Effect.Effect<OrchestrationDecision>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/Orchestrator") {}

function recordEntry(entries: PhaseEntry[], phase: string, durationMs: number, result: string): PhaseEntry[] {
  return [...entries, { phase, durationMs, result, error: undefined }]
}

const orchestrate = Effect.fn("OrchestratorService.orchestrate")(function* (input) {
  const classifier = yield* TaskClassifier.Service
  const confidence = yield* ConfidenceEngine.Service
  const dispatcher = yield* AgentDispatcher.Service
  const selector = yield* ModelSelector.Service
  const capabilityPlanner = yield* CapabilityPlanner.Service
  const specialistRegistry = yield* SpecialistRegistry.Service
  const knowledgePlanner = yield* KnowledgePlanner.Service
  const policyService = yield* PlanningPolicyService.Service

  const classification = yield* classifier.classify({
    text: input.promptText,
    filesAttached: input.filesAttached,
    conversationLength: input.conversationLength,
  })

  const richSignals = [
    { signal: "prompt-text", text: input.promptText, weight: 1.0 },
    ...(input.sessionMetadata
      ? [{ signal: "session-metadata" as const, text: JSON.stringify(input.sessionMetadata), weight: 0.3 }]
      : []),
    ...(input.assistantResponses
      ? input.assistantResponses.map((r: string) => ({ signal: "previous-responses" as const, text: r, weight: 0.4 }))
      : []),
    ...(input.toolResults
      ? input.toolResults.map((r: string) => ({ signal: "tool-results" as const, text: r, weight: 0.5 }))
      : []),
    ...(input.projectInfo
      ? [{ signal: "project-info" as const, text: input.projectInfo, weight: 0.6 }]
      : []),
  ]

  const classifications = yield* classifier.classifyRich({
    signals: richSignals,
    sessionMetadata: input.sessionMetadata,
    assistantResponses: input.assistantResponses,
    toolResults: input.toolResults,
    projectInfo: input.projectInfo,
  })

  const confidenceLevel = yield* confidence.estimate({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
  })

  const confidenceScore = yield* confidence.estimateWithScore({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
    classifications,
    sessionMetadata: input.sessionMetadata,
    toolHistory: input.toolResults,
  })

  if (confidenceLevel === "high") {
    return {
      needsOrchestration: false,
      taskClassification: classification,
      confidence: confidenceLevel,
      confidenceScore,
      dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
      knowledgeBundle: KnowledgeBundle.empty(classification.type),
      executionStatus: "completed",
      skipReason: "high confidence — no specialist agents needed",
      selectedCapabilities: undefined,
      knowledgeRequirements: undefined,
      executionNotes: undefined,
      specialistPlan: undefined,
      capabilityPlan: undefined,
      knowledgePlan: undefined,
      executionGraph: undefined,
      planningPolicy: undefined,
    }
  }

  const capabilityProfile = yield* selector.estimateCapabilities({
    taskType: classification.type,
    complexity: classification.complexity,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
  })

  const requiredCapabilities = capabilityProfile.requirements
    .filter((r) => !r.optional)
    .map((r) => r.capability)

  const capabilityPlan = yield* capabilityPlanner.plan({
    taskClassification: classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    sessionMetadata: input.sessionMetadata,
  })

  const specialistMatches = yield* specialistRegistry.filterByCapabilities(capabilityPlan.required, {
    maxSpecialists: 4,
    taskTypes: undefined,
    requiredCapabilities: capabilityPlan.required,
    minConfidence: undefined,
  })

  const policy = yield* policyService.evaluate({
    classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    capabilities: capabilityPlan.required,
  })

  const specialistPlan = yield* dispatcher.planSpecialists({
    taskType: classification.type,
    specialists: specialistMatches,
    capabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    maxSpecialists: policy.maxSpecialists,
  })

  const dispatchPlan = yield* dispatcher.planRich({
    taskType: classification.type,
    requiresContext: classification.requiresContext,
    requiresSearch: classification.requiresSearch,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    complexity: classification.complexity,
    classifications,
    confidenceScore: confidenceScore.score,
  })

  const knowledgePlan = yield* knowledgePlanner.plan({
    taskType: classification.type,
    requiredCapabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    predictedSpecialists: specialistPlan.selected.map((m) => m.specialist.id),
  })

  const knowledgeTypes: string[] = []
  if (classification.requiresSearch) knowledgeTypes.push("search")
  if (classification.requiresContext) knowledgeTypes.push("context")
  if (classification.requiresDependencyGraph) knowledgeTypes.push("dependency")
  if (classification.requiresVerification) knowledgeTypes.push("verification")

  const planMetadata: KnowledgePlanMetadata = {
    planStartTime: Date.now(),
    planEndTime: undefined,
    knowledgeVersion: 1,
    source: "classify",
  }

  const knowledgeBundle: KnowledgeBundle = {
    ...KnowledgeBundle.empty(classification.type),
    planMetadata,
    knowledgeRequirements: capabilityProfile.requirements.map((r) => ({
      domain: r.capability,
      description: `Capability requirement: ${r.capability} (weight ${r.weight})`,
      required: !r.optional,
    })),
    searchTargets: classification.requiresSearch
      ? [{ pattern: classification.type, description: "Search for relevant code", priority: 1, type: "code" as const }]
      : undefined,
    verificationTargets: classification.requiresVerification
      ? [{ target: classification.type, criteria: "Verify task requirements", priority: 1 }]
      : undefined,
    executionNotes: dispatchPlan.requiredAgents.length > 0
      ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
      : undefined,
  }

  return {
    needsOrchestration: dispatchPlan.requiredAgents.length > 0,
    taskClassification: classification,
    confidence: confidenceLevel,
    confidenceScore,
    dispatchPlan,
    knowledgeBundle,
    executionStatus: dispatchPlan.requiredAgents.length > 0 ? "collecting" : "completed",
    skipReason: dispatchPlan.requiredAgents.length === 0
      ? "no specialist agents required"
      : undefined,
    selectedCapabilities: requiredCapabilities,
    knowledgeRequirements: knowledgeTypes,
    executionNotes: dispatchPlan.requiredAgents.length > 0
      ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
      : undefined,
    specialistPlan: specialistMatches.length > 0 ? specialistPlan : undefined,
    capabilityPlan,
    knowledgePlan,
    executionGraph: undefined,
    planningPolicy: policy,
  }
})

const orchestrateWithContext = Effect.fn("OrchestratorService.orchestrateWithContext")(function* (input) {
  const output = yield* runAllStages(input)
  return output as {
    decision: OrchestrationDecision
    timing: TimingInfo
    diagnostics: readonly PhaseEntry[]
    executionGraph: DispatchExecutionGraph | undefined
    executionPackage: ExecutionPackage
  }
})

const skip = Effect.fn("OrchestratorService.skip")(function* (_input) {
  return {
    needsOrchestration: false,
    taskClassification: {
      type: "general-chat" as TaskType,
      complexity: 0,
      requiresContext: true,
      requiresSearch: false,
      requiresDependencyGraph: false,
      requiresVerification: false,
      confidence: "high" as ConfidenceLevel,
    },
    confidence: "high" as ConfidenceLevel,
    confidenceScore: undefined,
    dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
    knowledgeBundle: KnowledgeBundle.empty("general-chat"),
    executionStatus: "completed",
    skipReason: "orchestration not requested",
    selectedCapabilities: undefined,
    knowledgeRequirements: undefined,
    executionNotes: undefined,
    specialistPlan: undefined,
    capabilityPlan: undefined,
    knowledgePlan: undefined,
    executionGraph: undefined,
    planningPolicy: undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      orchestrate: orchestrate as Interface["orchestrate"],
      orchestrateWithContext: orchestrateWithContext as Interface["orchestrateWithContext"],
      skip: skip as Interface["skip"],
    })
  }),
).pipe(
  Layer.provide(
    Layer.provideMerge(
      Layer.mergeAll(
        // --- Tier 0: pure leaf services (no cross-deps) ---
        SpecialistRegistry.layer,
        KnowledgePlanner.layer,
        ExecutionGraphBuilder.layer,
        PlanningPolicyService.layer,
        PlanningMemory.layer,
        ContextBuilder.layer,
        KnowledgeCollector.layer,
        KnowledgeMerger.layer,
        FailureRecovery.layer,
        RuntimeContext.layer,
        PromptBuilder.layer,
        RepositoryIntelligence.layer,
        ContextIntelligence.layer,
        DependencyIntelligence.layer,
        DocumentationIntelligence.layer,
        ArchitectureIntelligence.layer,
        VerificationIntelligence.layer,
        KnowledgeValidator.layer,
        RankingEngine.layer,
        ExecutionPackageBuilder.layer,
        AgentContextService.layer,
        AgentHintsService.layer,
        AgentCapabilitiesService.layer,
        AgentSelectionAdviceService.layer.pipe(Layer.provideMerge(AgentCapabilitiesService.layer)),
        PromptAugmentationService.layer,
        AgentEnhancer.layer,
        AgentAdapter.layer,
        ExecutionAdvisor.layer,
        ContextCompressor.layer,
        RuntimeMetrics.layer,
        SpecialistConversation.layer,
        ExecutionBudget.layer,
        ConfidenceEngine.layer,
        ReasoningMemory.layer,
        SpecialistConsensus.layer,
        ExecutionNarrative.layer,
        TaskDecomposer.layer,
        WorkAllocationEngine.layer,
        TeamWorkspace.layer,
        TeamDiscussionEngine.layer,
        CapabilityMarketplace.layer,
        KnowledgeSourceRegistry.layer,
        RepositoryConnector.layer,
        DocumentationConnector.layer,
        ConversationConnector.layer,
        ToolHistoryConnector.layer,
        RuntimeCache.layer,
        RuntimeValidator.layer,
        RuntimeFallback.layer,
        ApplicationProfile.layer,
        ApplicationRegistry.layer,
        ApplicationCapabilities.layer,
        ApplicationWorkflows.layer,
        ApplicationServices.layer,
        ApplicationConnectors.layer,
        ApplicationContext.layer,
        OrganizationIntelligence.layer,
        ApplicationMemory.layer,
        ApplicationMetrics.layer,
        ExecutionSummaryView.layer,
        RepositoryView.layer,
        ArchitectureView.layer,
        DependencyView.layer,
        DocumentationView.layer,
        VerificationView.layer,
        ReasoningView.layer,
        PlanningView.layer,
        WorkflowView.layer,
        ConnectorView.layer,
        Catalog.layer,
        CapabilityRegistry.layer,
        SelectionCache.layer,
        SelectionPolicies.layer,
        ModelHealth.layer,
        ModelRequirements.layer,
        ProviderHealth.layer,
        ExecutionStrategy.layer,
        DecisionHistory.layer,
        WorkflowLearning.layer,
        KnowledgeFeedback.layer,
        ExecutionFeedback.layer,
        LearningMetrics.layer,
        CollaborationPolicy.layer,
        SharedWorkspace.layer,
        SpecialistScoreboard.layer,
        SpecialistMemory.layer,
        CollaborationSessionService.layer,
        ResourceProviderHealth.layer,
        ProviderAvailability.layer,
        BenchmarkStore.layer,
        PerformanceMemory.layer,
        PreferenceManager.layer,
        ResourceEstimator.layer,
        CapabilityMatcher.layer,
        RoutingPolicy.layer,
        FallbackEngine.layer,
      ),
      // --- Tier 1: deps resolved from Tier 0 ---
      Layer.mergeAll(
        ModelCatalog.layer.pipe(Layer.provideMerge(Catalog.layer)),
        ProviderCatalog.layer.pipe(Layer.provideMerge(Catalog.layer)),
        TeamCoordinator.layer.pipe(Layer.provideMerge(SpecialistConversation.layer)),
        CollaborationMetricsAggregator.layer.pipe(Layer.provideMerge(RuntimeMetrics.layer)),
        CapabilityPlanner.layer.pipe(Layer.provideMerge(SpecialistRegistry.layer)),
        ExecutionScheduler.layer.pipe(Layer.provideMerge(SpecialistRegistry.layer)),
        VirtualTeam.layer.pipe(Layer.provideMerge(SpecialistRegistry.layer)),
        ReviewPipelineService.layer.pipe(Layer.provideMerge(SpecialistRegistry.layer)),
        PeerReviewEngine.layer.pipe(Layer.provideMerge(Layer.mergeAll(SpecialistRegistry.layer, SpecialistConversation.layer))),
        DecisionEngine.layer.pipe(Layer.provideMerge(ReasoningMemory.layer)),
        ConflictResolution.layer.pipe(Layer.provideMerge(SpecialistConsensus.layer)),
        DiscussionModerator.layer.pipe(Layer.provideMerge(Layer.mergeAll(TeamDiscussionEngine.layer, SpecialistConversation.layer))),
        KnowledgeConnector.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(RepositoryConnector.layer, DocumentationConnector.layer, ConversationConnector.layer, ToolHistoryConnector.layer)),
        ),
        ConnectorCoordinator.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(KnowledgeSourceRegistry.layer, RepositoryConnector.layer, DocumentationConnector.layer, ConversationConnector.layer, ToolHistoryConnector.layer, RuntimeMetrics.layer)),
        ),
        ApplicationAnalyzer.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
        ApplicationDiscovery.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
        DomainIntelligence.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
        BusinessIntelligence.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
        FeatureIntelligence.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
        WorkflowIntelligence.layer.pipe(Layer.provideMerge(ApplicationWorkflows.layer)),
        ServiceIntelligence.layer.pipe(Layer.provideMerge(ApplicationServices.layer)),
        IntegrationIntelligence.layer.pipe(Layer.provideMerge(ApplicationConnectors.layer)),
        ApplicationHealth.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ApplicationServices.layer, ApplicationConnectors.layer)),
        ),
        ModelRanking.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        ModelProfile.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        ModelCapabilities.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        FallbackStrategy.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        CostEstimator.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        ContextEstimator.layer.pipe(Layer.provideMerge(ModelCatalog.layer)),
        ModelDiscovery.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ModelCatalog.layer, ProviderCatalog.layer)),
        ),
        ProviderRanking.layer.pipe(Layer.provideMerge(ProviderCatalog.layer)),
        ProviderAdapter.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ProviderCatalog.layer, ModelCatalog.layer)),
        ),
        LatencyEstimator.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ModelCatalog.layer, ProviderCatalog.layer)),
        ),
        CapabilityDiscovery.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ModelCatalog.layer, CapabilityRegistry.layer)),
        ),
        StrategyEvaluator.layer.pipe(Layer.provideMerge(DecisionHistory.layer)),
        ConfidenceLearning.layer.pipe(Layer.provideMerge(DecisionHistory.layer)),
        PlanningOptimizer.layer.pipe(Layer.provideMerge(DecisionHistory.layer)),
        ConsensusEngine.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(SpecialistConsensus.layer, CollaborationPolicy.layer)),
        ),
        SpecialistCoordinator.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(SpecialistRegistry.layer, SpecialistScoreboard.layer, SpecialistConversation.layer)),
        ),
        SelectionEngine.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(CapabilityMatcher.layer, ResourceEstimator.layer, ResourceProviderHealth.layer, ProviderAvailability.layer, BenchmarkStore.layer, PerformanceMemory.layer, PreferenceManager.layer, RoutingPolicy.layer, FallbackEngine.layer, ModelCatalog.layer, ProviderCatalog.layer)),
        ),
      ),
      // --- Tier 2: deps resolved from Tiers 0..1 ---
      Layer.mergeAll(
        ReviewManager.layer.pipe(Layer.provideMerge(ReviewPipelineService.layer)),
        ReasoningBuilder.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(DecisionEngine.layer, ReasoningMemory.layer, RuntimeMetrics.layer)),
        ),
        ApplicationIntelligence.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ApplicationProfile.layer, ApplicationAnalyzer.layer, ApplicationCapabilities.layer, ApplicationWorkflows.layer, ApplicationServices.layer)),
        ),
        ModuleIntelligence.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ApplicationProfile.layer, ApplicationAnalyzer.layer)),
        ),
        LearningEngine.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(DecisionHistory.layer, StrategyEvaluator.layer, PlanningOptimizer.layer, ConfidenceLearning.layer, KnowledgeFeedback.layer, ExecutionFeedback.layer, WorkflowLearning.layer, LearningMetrics.layer)),
        ),
        ModelSelector.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(CapabilityRegistry.layer, SelectionEngine.layer, SelectionPolicies.layer)),
        ),
      ),
      // --- Tier 3: deps resolved from Tiers 0..2 ---
      Layer.mergeAll(
        CollaborationEngineService.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(CollaborationPolicy.layer, CollaborationSessionService.layer, ConsensusEngine.layer, ConflictResolution.layer, DiscussionModerator.layer, PeerReviewEngine.layer, SharedWorkspace.layer, SpecialistCoordinator.layer, SpecialistScoreboard.layer, SpecialistMemory.layer, ReviewManager.layer)),
        ),
        ApplicationSummaryEngine.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ApplicationProfile.layer, ApplicationIntelligence.layer, DomainIntelligence.layer, BusinessIntelligence.layer, WorkflowIntelligence.layer, FeatureIntelligence.layer, ModuleIntelligence.layer, ServiceIntelligence.layer, IntegrationIntelligence.layer, OrganizationIntelligence.layer)),
        ),
        ModelAssignment.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ModelSelector.layer, ModelRanking.layer, SelectionPolicies.layer, CapabilityRegistry.layer)),
        ),
      ),
      // --- Tier 4 ---
      Layer.mergeAll(
        SpecialistExecutor.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(SpecialistRegistry.layer, ModelAssignment.layer)),
        ),
      ),
      // --- Tier 5 ---
      Layer.mergeAll(
        SpecialistRunner.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(ExecutionScheduler.layer, SpecialistExecutor.layer, FailureRecovery.layer, SpecialistRegistry.layer)),
        ),
      ),
      // --- Tier 6 ---
      Layer.mergeAll(
        RuntimeManager.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(RuntimeCache.layer, RuntimeMetrics.layer, RuntimeContext.layer, SpecialistRunner.layer, ContextBuilder.layer)),
        ),
      ),
    ),
  ),
)

export { layer }
