export * as OrchestratorEvents from "./events"
export * as RuntimeEvents from "../runtime/runtime-events"

import { Schema } from "effect"
import { Event } from "@opencode-ai/schema/event"
import { TaskClassification } from "../classifier/schema"
import { ConfidenceLevel } from "../types/confidence"
import { ExecutionStatus } from "../types/execution-status"

export const TaskClassified = Event.define({
  type: "orchestrator.task-classified",
  schema: {
    sessionID: Schema.String,
    taskClassification: TaskClassification,
  },
})

export const ConfidenceCalculated = Event.define({
  type: "orchestrator.confidence-calculated",
  schema: {
    sessionID: Schema.String,
    confidence: ConfidenceLevel,
    score: Schema.Finite,
  },
})

export const ModelSelected = Event.define({
  type: "orchestrator.model-selected",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    capabilities: Schema.Array(Schema.String),
    matchScore: Schema.Finite.pipe(Schema.optional),
  },
})

export const KnowledgePrepared = Event.define({
  type: "orchestrator.knowledge-prepared",
  schema: {
    sessionID: Schema.String,
    knowledgeTargets: Schema.Array(Schema.String),
    planMetadata: Schema.Struct({
      knowledgeVersion: Schema.Finite,
      source: Schema.String,
    }),
  },
})

export const DispatchPlanned = Event.define({
  type: "orchestrator.dispatch-planned",
  schema: {
    sessionID: Schema.String,
    dispatchPlan: Schema.Struct({
      requiredAgents: Schema.Array(Schema.String),
      executionOrder: Schema.Array(Schema.Array(Schema.String)),
      knowledgeTargets: Schema.Array(Schema.String),
    }),
  },
})

export const KnowledgeRequested = Event.define({
  type: "orchestrator.knowledge-requested",
  schema: {
    sessionID: Schema.String,
    agentID: Schema.String,
    targets: Schema.Array(Schema.String),
  },
})

export const KnowledgeReady = Event.define({
  type: "orchestrator.knowledge-ready",
  schema: {
    sessionID: Schema.String,
    agentID: Schema.String,
    bundle: Schema.Struct({
      taskType: Schema.String,
      repositorySummary: Schema.String.pipe(Schema.optional),
      relevantFiles: Schema.Array(Schema.String),
      contextSummary: Schema.String.pipe(Schema.optional),
    }),
  },
})

export const OrchestrationFinished = Event.define({
  type: "orchestrator.orchestration-finished",
  schema: {
    sessionID: Schema.String,
    needsOrchestration: Schema.Boolean,
    confidence: ConfidenceLevel,
    status: ExecutionStatus,
  },
})

export const OrchestrationCompleted = Event.define({
  type: "orchestrator.orchestration-completed",
  schema: {
    sessionID: Schema.String,
    confidence: ConfidenceLevel,
    status: ExecutionStatus,
    needsOrchestration: Schema.Boolean,
    totalDurationMs: Schema.Finite,
    selectedCapabilities: Schema.Array(Schema.String),
  },
})

export const SpecialistStarted = Event.define({
  type: "orchestrator.specialist-started",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    specialistName: Schema.String,
  },
})

export const SpecialistCompleted = Event.define({
  type: "orchestrator.specialist-completed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    confidence: Schema.Finite,
    executionTimeMs: Schema.Finite,
  },
})

export const SpecialistFailed = Event.define({
  type: "orchestrator.specialist-failed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    error: Schema.String,
  },
})

export const KnowledgeMerged = Event.define({
  type: "orchestrator.knowledge-merged",
  schema: {
    sessionID: Schema.String,
    totalEntries: Schema.Finite,
    totalConfidence: Schema.Finite,
  },
})

export const ExecutionScheduled = Event.define({
  type: "orchestrator.execution-scheduled",
  schema: {
    sessionID: Schema.String,
    batches: Schema.Finite,
    estimatedDurationMs: Schema.Finite,
  },
})

export const ExecutionCompleted = Event.define({
  type: "orchestrator.execution-completed",
  schema: {
    sessionID: Schema.String,
    completed: Schema.Finite,
    failed: Schema.Finite,
    partial: Schema.Boolean,
  },
})

export const ExecutionAdvised = Event.define({
  type: "orchestrator.execution-advised",
  schema: {
    sessionID: Schema.String,
    riskCount: Schema.Finite,
    recommendationCount: Schema.Finite,
    executionPriority: Schema.String,
  },
})

export const ExecutionOptimized = Event.define({
  type: "orchestrator.execution-optimized",
  schema: {
    sessionID: Schema.String,
    savedBytes: Schema.Finite,
    removedDuplicates: Schema.Finite,
  },
})

export const LearningCycleCompleted = Event.define({
  type: "orchestrator.learning-cycle-completed",
  schema: {
    sessionID: Schema.String,
    cycleNumber: Schema.Finite,
    recommendationsCount: Schema.Finite,
    confidenceAdjustments: Schema.Finite,
    planningImprovements: Schema.Finite,
  },
})

export const DecisionOptimized = Event.define({
  type: "orchestrator.decision-optimized",
  schema: {
    sessionID: Schema.String,
    decisionType: Schema.String,
    previousStrategy: Schema.String,
    optimizedStrategy: Schema.String,
    improvementRationale: Schema.String,
  },
})

export const WorkflowImproved = Event.define({
  type: "orchestrator.workflow-improved",
  schema: {
    sessionID: Schema.String,
    workflowLabel: Schema.String,
    previousScore: Schema.Finite,
    newScore: Schema.Finite,
  },
})

export const PlanningOptimized = Event.define({
  type: "orchestrator.planning-optimized",
  schema: {
    sessionID: Schema.String,
    optimizations: Schema.Finite,
    specialistOrderingChanged: Schema.Boolean,
    workflowOrderingChanged: Schema.Boolean,
  },
})

export const ConfidenceImproved = Event.define({
  type: "orchestrator.confidence-improved",
  schema: {
    sessionID: Schema.String,
    factorName: Schema.String,
    previousWeight: Schema.Finite,
    newWeight: Schema.Finite,
    observationCount: Schema.Finite,
  },
})

export const KnowledgeFeedbackRecorded = Event.define({
  type: "orchestrator.knowledge-feedback-recorded",
  schema: {
    sessionID: Schema.String,
    domain: Schema.String,
    wasUsed: Schema.Boolean,
    wasReused: Schema.Boolean,
  },
})

export const ExecutionFeedbackRecorded = Event.define({
  type: "orchestrator.execution-feedback-recorded",
  schema: {
    sessionID: Schema.String,
    workflowLabel: Schema.String,
    durationMs: Schema.Finite,
    completed: Schema.Boolean,
  },
})

export const PromptEnhanced = Event.define({
  type: "orchestrator.prompt-enhanced",
  schema: {
    sessionID: Schema.String,
    sections: Schema.Array(Schema.String),
    augmentationLength: Schema.Finite,
  },
})

export const ToolAdviceGenerated = Event.define({
  type: "orchestrator.tool-advice-generated",
  schema: {
    sessionID: Schema.String,
    suggestedTools: Schema.Array(Schema.String),
    avoidTools: Schema.Array(Schema.String),
  },
})

export const KnowledgeCompressed = Event.define({
  type: "orchestrator.knowledge-compressed",
  schema: {
    sessionID: Schema.String,
    originalSize: Schema.Finite,
    compressedSize: Schema.Finite,
  },
})

export const KnowledgeReused = Event.define({
  type: "orchestrator.knowledge-reused",
  schema: {
    sessionID: Schema.String,
    reusedSummaryCount: Schema.Finite,
    savingsBytes: Schema.Finite,
  },
})

export const ExecutionPackageEnhanced = Event.define({
  type: "orchestrator.execution-package-enhanced",
  schema: {
    sessionID: Schema.String,
    hasExecutionIntelligence: Schema.Boolean,
    hasCompressedContext: Schema.Boolean,
  },
})

export const WorkflowRecommended = Event.define({
  type: "orchestrator.workflow-recommended",
  schema: {
    sessionID: Schema.String,
    workflow: Schema.String,
  },
})

export const ReasoningBuilt = Event.define({
  type: "orchestrator.reasoning-built",
  schema: {
    sessionID: Schema.String,
    narrativeLength: Schema.Finite,
    consensus: Schema.String,
  },
})

export const ConsensusGenerated = Event.define({
  type: "orchestrator.consensus-generated",
  schema: {
    sessionID: Schema.String,
    overallConsensus: Schema.String,
    overallConfidence: Schema.Finite,
    agreements: Schema.Finite,
    disagreements: Schema.Finite,
  },
})

export const NarrativeGenerated = Event.define({
  type: "orchestrator.narrative-generated",
  schema: {
    sessionID: Schema.String,
    sections: Schema.Finite,
    fullTextLength: Schema.Finite,
  },
})

export const DecisionGenerated = Event.define({
  type: "orchestrator.decision-generated",
  schema: {
    sessionID: Schema.String,
    decisions: Schema.Finite,
    showVerificationAdvice: Schema.Boolean,
  },
})

export const ReasoningReused = Event.define({
  type: "orchestrator.reasoning-reused",
  schema: {
    sessionID: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ReasoningCompressed = Event.define({
  type: "orchestrator.reasoning-compressed",
  schema: {
    sessionID: Schema.String,
    originalSize: Schema.Finite,
    compressedSize: Schema.Finite,
  },
})

export const NarrativeUpdated = Event.define({
  type: "orchestrator.narrative-updated",
  schema: {
    sessionID: Schema.String,
    updatedSections: Schema.Finite,
  },
})

export const TeamCreated = Event.define({
  type: "orchestrator.team-created",
  schema: {
    sessionID: Schema.String,
    teamSize: Schema.Finite,
    activeMembers: Schema.Finite,
  },
})

export const TasksDecomposed = Event.define({
  type: "orchestrator.tasks-decomposed",
  schema: {
    sessionID: Schema.String,
    taskCount: Schema.Finite,
    estimatedComplexity: Schema.Finite,
  },
})

export const WorkAllocated = Event.define({
  type: "orchestrator.work-allocated",
  schema: {
    sessionID: Schema.String,
    assignmentCount: Schema.Finite,
    priority: Schema.String,
  },
})

export const WorkspaceUpdated = Event.define({
  type: "orchestrator.workspace-updated",
  schema: {
    sessionID: Schema.String,
    workspaceCount: Schema.Finite,
  },
})

export const TeamDiscussionBuilt = Event.define({
  type: "orchestrator.team-discussion-built",
  schema: {
    sessionID: Schema.String,
    agreements: Schema.Finite,
    disagreements: Schema.Finite,
  },
})

export const ReviewCompleted = Event.define({
  type: "orchestrator.review-completed",
  schema: {
    sessionID: Schema.String,
    stagesCompleted: Schema.Finite,
    totalStages: Schema.Finite,
  },
})

export const CapabilityAdvertised = Event.define({
  type: "orchestrator.capability-advertised",
  schema: {
    sessionID: Schema.String,
    advertisements: Schema.Finite,
  },
})

export const CollaborationStarted = Event.define({
  type: "orchestrator.collaboration-started",
  schema: {
    sessionID: Schema.String,
    policy: Schema.String,
    participantCount: Schema.Finite,
  },
})

export const CollaborationCompleted = Event.define({
  type: "orchestrator.collaboration-completed",
  schema: {
    sessionID: Schema.String,
    teamPlanCreated: Schema.Boolean,
  },
})

export const PeerReviewStarted = Event.define({
  type: "orchestrator.peer-review-started",
  schema: {
    sessionID: Schema.String,
    reviewerID: Schema.String,
    targetID: Schema.String,
  },
})

export const ConnectorRegistered = Event.define({
  type: "orchestrator.connector-registered",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    enabled: Schema.Boolean,
  },
})

export const ConnectorRequested = Event.define({
  type: "orchestrator.connector-requested",
  schema: {
    sessionID: Schema.String,
    requestCount: Schema.Finite,
    hasRequired: Schema.Boolean,
  },
})

export const ConnectorPrepared = Event.define({
  type: "orchestrator.connector-prepared",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    status: Schema.String,
  },
})

export const ConnectorReused = Event.define({
  type: "orchestrator.connector-reused",
  schema: {
    sessionID: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ConnectorCompleted = Event.define({
  type: "orchestrator.connector-completed",
  schema: {
    sessionID: Schema.String,
    totalConnectors: Schema.Finite,
    preparedCount: Schema.Finite,
    skippedCount: Schema.Finite,
  },
})

export const KnowledgeSourceDiscovered = Event.define({
  type: "orchestrator.knowledge-source-discovered",
  schema: {
    sessionID: Schema.String,
    discoveredTypes: Schema.Finite,
  },
})

export const ConnectorCacheHit = Event.define({
  type: "orchestrator.connector-cache-hit",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
  },
})

export const ConnectorCacheMiss = Event.define({
  type: "orchestrator.connector-cache-miss",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
  },
})

export const SpecialistRegistered = Event.define({
  type: "orchestrator.specialist-registered",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    specialistName: Schema.String,
  },
})

export const ExecutionStrategyPrepared = Event.define({
  type: "orchestrator.execution-strategy-prepared",
  schema: {
    sessionID: Schema.String,
    strategy: Schema.String,
    taskType: Schema.String,
    complexity: Schema.Finite,
    confidence: Schema.Finite,
  },
})

export const CapabilityMatched = Event.define({
  type: "orchestrator.capability-matched",
  schema: {
    sessionID: Schema.String,
    requestedCapabilities: Schema.Array(Schema.String),
    matchedCapabilities: Schema.Array(Schema.String),
    missingCapabilities: Schema.Array(Schema.String),
    matchScore: Schema.Finite,
  },
})

export const ModelHealthUpdated = Event.define({
  type: "orchestrator.model-health-updated",
  schema: {
    sessionID: Schema.String,
    modelID: Schema.String,
    providerID: Schema.String,
    healthScore: Schema.Finite,
    availabilityCount: Schema.Finite,
    failureCount: Schema.Finite,
  },
})

export const RoutingCompleted = Event.define({
  type: "orchestrator.routing-completed",
  schema: {
    sessionID: Schema.String,
    selectedModelID: Schema.String,
    selectedProviderID: Schema.String,
    strategy: Schema.String,
    executionPlan: Schema.String,
    capabilityCount: Schema.Finite,
    fallbackReady: Schema.Boolean,
  },
})

export const SpecialistActivated = Event.define({
  type: "orchestrator.specialist-activated",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    taskType: Schema.String,
  },
})

export const SpecialistPrepared = Event.define({
  type: "orchestrator.specialist-prepared",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    status: Schema.String,
  },
})

export const SpecialistReviewed = Event.define({
  type: "orchestrator.specialist-reviewed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    reviewStatus: Schema.String,
    findings: Schema.Finite,
  },
})

export const SpecialistApproved = Event.define({
  type: "orchestrator.specialist-approved",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    approvalType: Schema.String,
  },
})

export const SpecialistEscalated = Event.define({
  type: "orchestrator.specialist-escalated",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    reason: Schema.String,
  },
})

export const KnowledgeReviewed = Event.define({
  type: "orchestrator.knowledge-reviewed",
  schema: {
    sessionID: Schema.String,
    knowledgeType: Schema.String,
    reviewerID: Schema.String,
    status: Schema.String,
  },
})

export const KnowledgeApproved = Event.define({
  type: "orchestrator.knowledge-approved",
  schema: {
    sessionID: Schema.String,
    knowledgeType: Schema.String,
    approverID: Schema.String,
  },
})

export const ConsensusReached = Event.define({
  type: "orchestrator.consensus-reached",
  schema: {
    sessionID: Schema.String,
    consensusLevel: Schema.String,
    agreementCount: Schema.Finite,
    disagreementCount: Schema.Finite,
  },
})

export const ModelCatalogUpdated = Event.define({
  type: "orchestrator.model-catalog-updated",
  schema: {
    sessionID: Schema.String,
    modelCount: Schema.Finite,
    providerCount: Schema.Finite,
    refreshDurationMs: Schema.Finite,
  },
})

export const ProviderCatalogUpdated = Event.define({
  type: "orchestrator.provider-catalog-updated",
  schema: {
    sessionID: Schema.String,
    providerCount: Schema.Finite,
    availableCount: Schema.Finite,
    refreshDurationMs: Schema.Finite,
  },
})

export const CapabilitiesDiscovered = Event.define({
  type: "orchestrator.capabilities-discovered",
  schema: {
    sessionID: Schema.String,
    totalCapabilities: Schema.Finite,
    coveredCapabilities: Schema.Finite,
    coverageRatio: Schema.Finite,
  },
})

export const ModelRanked = Event.define({
  type: "orchestrator.model-ranked",
  schema: {
    sessionID: Schema.String,
    strategy: Schema.String,
    topModelID: Schema.String,
    topProviderID: Schema.String,
    topScore: Schema.Finite,
    candidateCount: Schema.Finite,
  },
})

export const ProviderRanked = Event.define({
  type: "orchestrator.provider-ranked",
  schema: {
    sessionID: Schema.String,
    strategy: Schema.String,
    topProviderID: Schema.String,
    topScore: Schema.Finite,
    candidateCount: Schema.Finite,
  },
})

export const FallbackPrepared = Event.define({
  type: "orchestrator.fallback-prepared",
  schema: {
    sessionID: Schema.String,
    primaryModelID: Schema.String,
    primaryProviderID: Schema.String,
    fallbackModelID: Schema.String.pipe(Schema.optional),
    fallbackProviderID: Schema.String.pipe(Schema.optional),
    emergencyModelID: Schema.String.pipe(Schema.optional),
    reason: Schema.String,
  },
})

export const SelectionPolicyApplied = Event.define({
  type: "orchestrator.selection-policy-applied",
  schema: {
    sessionID: Schema.String,
    policyName: Schema.String,
    strategy: Schema.String,
    capabilityCount: Schema.Finite,
    taskComplexity: Schema.Finite,
  },
})

export const CatalogRefreshed = Event.define({
  type: "orchestrator.catalog-refreshed",
  schema: {
    sessionID: Schema.String,
    modelCount: Schema.Finite,
    providerCount: Schema.Finite,
    newModelCount: Schema.Finite,
    deprecatedModelCount: Schema.Finite,
    refreshDurationMs: Schema.Finite,
  },
})

export const ApplicationProfiled = Event.define({
  type: "orchestrator.application-profiled",
  schema: {
    sessionID: Schema.String,
    applicationType: Schema.String,
    businessDomain: Schema.String,
    moduleCount: Schema.Finite,
    capabilityCount: Schema.Finite,
  },
})

export const ApplicationAnalyzed = Event.define({
  type: "orchestrator.application-analyzed",
  schema: {
    sessionID: Schema.String,
    workflowCount: Schema.Finite,
    capabilityCount: Schema.Finite,
    integrationPointCount: Schema.Finite,
  },
})

export const ApplicationDiscovered = Event.define({
  type: "orchestrator.application-discovered",
  schema: {
    sessionID: Schema.String,
    detectedType: Schema.String,
    detectedDomain: Schema.String,
    detectedModuleCount: Schema.Finite,
  },
})

export const ApplicationIntelligenceReported = Event.define({
  type: "orchestrator.application-intelligence-reported",
  schema: {
    sessionID: Schema.String,
    applicationName: Schema.String,
    moduleCount: Schema.Finite,
    workflowCount: Schema.Finite,
    capabilityCount: Schema.Finite,
    serviceCount: Schema.Finite,
  },
})

export const DomainAnalyzed = Event.define({
  type: "orchestrator.domain-analyzed",
  schema: {
    sessionID: Schema.String,
    domain: Schema.String,
    termCount: Schema.Finite,
  },
})

export const BusinessAnalyzed = Event.define({
  type: "orchestrator.business-analyzed",
  schema: {
    sessionID: Schema.String,
    departmentCount: Schema.Finite,
    processCount: Schema.Finite,
  },
})

export const WorkflowAnalyzed = Event.define({
  type: "orchestrator.workflow-analyzed",
  schema: {
    sessionID: Schema.String,
    workflowCount: Schema.Finite,
    bottleneckCount: Schema.Finite,
  },
})

export const FeatureCatalogBuilt = Event.define({
  type: "orchestrator.feature-catalog-built",
  schema: {
    sessionID: Schema.String,
    featureCount: Schema.Finite,
    duplicateCount: Schema.Finite,
  },
})

export const ModuleAnalyzed = Event.define({
  type: "orchestrator.module-analyzed",
  schema: {
    sessionID: Schema.String,
    moduleCount: Schema.Finite,
    dependencyCount: Schema.Finite,
  },
})

export const ServiceAnalyzed = Event.define({
  type: "orchestrator.service-analyzed",
  schema: {
    sessionID: Schema.String,
    serviceCount: Schema.Finite,
    endpointCount: Schema.Finite,
  },
})

export const IntegrationAnalyzed = Event.define({
  type: "orchestrator.integration-analyzed",
  schema: {
    sessionID: Schema.String,
    connectorCount: Schema.Finite,
    apiCount: Schema.Finite,
  },
})

export const OrganizationAnalyzed = Event.define({
  type: "orchestrator.organization-analyzed",
  schema: {
    sessionID: Schema.String,
    departmentCount: Schema.Finite,
  },
})

export const ApplicationSummaryBuilt = Event.define({
  type: "orchestrator.application-summary-built",
  schema: {
    sessionID: Schema.String,
    moduleCount: Schema.Finite,
    workflowCount: Schema.Finite,
    serviceCount: Schema.Finite,
    featureCount: Schema.Finite,
  },
})

export const ApplicationKnowledgeReused = Event.define({
  type: "orchestrator.application-knowledge-reused",
  schema: {
    sessionID: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ResourceSelectionCompleted = Event.define({
  type: "orchestrator.resource-selection-completed",
  schema: {
    sessionID: Schema.String,
    selectedProviderID: Schema.String,
    selectedModelID: Schema.String,
    routingStrategy: Schema.String,
    selectionConfidence: Schema.Finite,
    candidateCount: Schema.Finite,
  },
})

export const ResourceSelectionFailed = Event.define({
  type: "orchestrator.resource-selection-failed",
  schema: {
    sessionID: Schema.String,
    error: Schema.String,
    requiredCapabilities: Schema.Array(Schema.String),
  },
})

export const FallbackTriggered = Event.define({
  type: "orchestrator.fallback-triggered",
  schema: {
    sessionID: Schema.String,
    fromProviderID: Schema.String,
    fromModelID: Schema.String,
    toProviderID: Schema.String,
    toModelID: Schema.String,
    reason: Schema.String,
  },
})

export const ProviderHealthRecorded = Event.define({
  type: "orchestrator.provider-health-recorded",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    healthScore: Schema.Finite,
    available: Schema.Boolean,
  },
})

export const ProviderSelected = Event.define({
  type: "orchestrator.provider-selected",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    routingStrategy: Schema.String,
  },
})

export const ProviderUnavailable = Event.define({
  type: "orchestrator.provider-unavailable",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    reason: Schema.String,
  },
})

export const ModelRejected = Event.define({
  type: "orchestrator.model-rejected",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    reason: Schema.String,
  },
})

export const BenchmarkUpdated = Event.define({
  type: "orchestrator.benchmark-updated",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    capability: Schema.String,
    score: Schema.Finite,
  },
})

export const PreferenceChanged = Event.define({
  type: "orchestrator.preference-changed",
  schema: {
    sessionID: Schema.String,
    category: Schema.String,
    key: Schema.String,
    value: Schema.String,
  },
})

export const CatalogUpdated = Event.define({
  type: "orchestrator.catalog-updated",
  schema: {
    sessionID: Schema.String,
    providerCount: Schema.Finite,
    modelCount: Schema.Finite,
  },
})

import {
  RuntimeStarted,
  RuntimeCompleted,
  RuntimeFailed,
  RuntimeRecovered,
  SpecialistAssigned,
  SpecialistExecuted as RuntimeSpecialistExecuted,
  CacheHit,
  CacheMiss,
  KnowledgeValidated,
  KnowledgeRanked,
  KnowledgeRejected,
  KnowledgeCached,
  KnowledgeReused as RuntimeKnowledgeReused,
  RepositoryAnalysed,
  ArchitectureAnalysed,
  DependencyAnalysed,
  DocumentationAnalysed,
  VerificationCompleted,
  ExecutionPackageBuilt,
  AgentEnhanced,
  AgentAdviceGenerated,
  PromptAugmented,
  ExecutionPackageReused,
  SpecialistSessionCreated,
  SpecialistSessionCompleted,
  KnowledgeShared,
  KnowledgeTransferred,
  ConsensusStarted,
  ConsensusCompleted,
  ExecutionRetried,
  ExecutionRecovered,
  ExecutionCancelled,
  CloudExecutionPrepared,
  CloudExecutionCompleted,
  BudgetExceeded,
  ExecutionAdapted,
  ExecutionSummaryPrepared,
  ExecutionPackageProjected,
  ConnectorPlanReused,
  PromptMetadataPrepared,
  ExecutionPackageDelivered,
  ContextPrioritized,
  WorkflowContextPrepared,
  ConnectorRegistered as RuntimeConnectorRegistered,
  ConnectorRequested as RuntimeConnectorRequested,
  ConnectorPrepared as RuntimeConnectorPrepared,
  ConnectorCompleted as RuntimeConnectorCompleted,
  KnowledgeSourceDiscovered as RuntimeKnowledgeSourceDiscovered,
  ConnectorCacheHit as RuntimeConnectorCacheHit,
  ConnectorCacheMiss as RuntimeConnectorCacheMiss,
  TeamCreated as RuntimeTeamCreated,
  TasksDecomposed as RuntimeTasksDecomposed,
  WorkAllocated as RuntimeWorkAllocated,
  WorkspaceUpdated as RuntimeWorkspaceUpdated,
  TeamDiscussionBuilt as RuntimeTeamDiscussionBuilt,
  ReviewCompleted as RuntimeReviewCompleted,
  CapabilityAdvertised as RuntimeCapabilityAdvertised,
  CollaborationCompleted as RuntimeCollaborationCompleted,
  ReasoningBuilt as RuntimeReasoningBuilt,
  ConsensusGenerated as RuntimeConsensusGenerated,
  NarrativeGenerated as RuntimeNarrativeGenerated,
  DecisionGenerated as RuntimeDecisionGenerated,
  ReasoningReused as RuntimeReasoningReused,
  ReasoningCompressed as RuntimeReasoningCompressed,
  NarrativeUpdated as RuntimeNarrativeUpdated,
} from "../runtime/runtime-events"

export const Definitions = [
  TaskClassified,
  ConfidenceCalculated,
  ModelSelected,
  KnowledgePrepared,
  DispatchPlanned,
  KnowledgeRequested,
  KnowledgeReady,
  OrchestrationFinished,
  OrchestrationCompleted,
  SpecialistStarted,
  SpecialistCompleted,
  SpecialistFailed,
  KnowledgeMerged,
  ExecutionScheduled,
  ExecutionCompleted,
  RuntimeStarted,
  RuntimeCompleted,
  RuntimeFailed,
  RuntimeRecovered,
  SpecialistAssigned,
  RuntimeSpecialistExecuted,
  CacheHit,
  CacheMiss,
  KnowledgeValidated,
  KnowledgeRanked,
  KnowledgeRejected,
  KnowledgeCached,
  RuntimeKnowledgeReused,
  RepositoryAnalysed,
  ArchitectureAnalysed,
  DependencyAnalysed,
  DocumentationAnalysed,
  VerificationCompleted,
  ExecutionPackageBuilt,
  AgentEnhanced,
  AgentAdviceGenerated,
  PromptAugmented,
  ExecutionPackageReused,
  ExecutionAdvised,
  ExecutionOptimized,
  PromptEnhanced,
  ToolAdviceGenerated,
  KnowledgeCompressed,
  KnowledgeReused,
  ExecutionPackageEnhanced,
  WorkflowRecommended,
  ReasoningBuilt,
  ConsensusGenerated,
  NarrativeGenerated,
  DecisionGenerated,
  ReasoningReused,
  ReasoningCompressed,
  NarrativeUpdated,
  TeamCreated,
  TasksDecomposed,
  WorkAllocated,
  WorkspaceUpdated,
  TeamDiscussionBuilt,
  ReviewCompleted,
  CapabilityAdvertised,
  CollaborationStarted,
  CollaborationCompleted,
  PeerReviewStarted,
  ConnectorRegistered,
  ConnectorRequested,
  ConnectorPrepared,
  ConnectorReused,
  ConnectorCompleted,
  KnowledgeSourceDiscovered,
  ConnectorCacheHit,
  ConnectorCacheMiss,
  SpecialistRegistered,
  SpecialistActivated,
  SpecialistPrepared,
  SpecialistReviewed,
  SpecialistApproved,
  SpecialistEscalated,
  KnowledgeReviewed,
  KnowledgeApproved,
  ConsensusReached,
  ModelCatalogUpdated,
  ProviderCatalogUpdated,
  CapabilitiesDiscovered,
  ModelRanked,
  ProviderRanked,
  FallbackPrepared,
  SelectionPolicyApplied,
  CatalogRefreshed,
  SpecialistSessionCreated,
  SpecialistSessionCompleted,
  KnowledgeShared,
  KnowledgeTransferred,
  ConsensusStarted,
  ConsensusCompleted,
  ExecutionRetried,
  ExecutionRecovered,
  ExecutionCancelled,
  CloudExecutionPrepared,
  CloudExecutionCompleted,
  BudgetExceeded,
  ExecutionAdapted,
  ExecutionSummaryPrepared,
  ExecutionPackageProjected,
  ConnectorPlanReused,
  PromptMetadataPrepared,
  ExecutionPackageDelivered,
  ContextPrioritized,
  WorkflowContextPrepared,
  RuntimeConnectorRegistered,
  RuntimeConnectorRequested,
  RuntimeConnectorPrepared,
  RuntimeConnectorCompleted,
  RuntimeKnowledgeSourceDiscovered,
  RuntimeConnectorCacheHit,
  RuntimeConnectorCacheMiss,
  RuntimeTeamCreated,
  RuntimeTasksDecomposed,
  RuntimeWorkAllocated,
  RuntimeWorkspaceUpdated,
  RuntimeTeamDiscussionBuilt,
  RuntimeReviewCompleted,
  RuntimeCapabilityAdvertised,
  RuntimeCollaborationCompleted,
  RuntimeReasoningBuilt,
  RuntimeConsensusGenerated,
  RuntimeNarrativeGenerated,
  RuntimeDecisionGenerated,
  RuntimeReasoningReused,
  RuntimeReasoningCompressed,
  RuntimeNarrativeUpdated,
  LearningCycleCompleted,
  DecisionOptimized,
  WorkflowImproved,
  PlanningOptimized,
  ConfidenceImproved,
  KnowledgeFeedbackRecorded,
   ExecutionFeedbackRecorded,
  ExecutionStrategyPrepared,
  CapabilityMatched,
  ModelHealthUpdated,
  RoutingCompleted,
  ApplicationProfiled,
  ApplicationAnalyzed,
  ApplicationDiscovered,
  ApplicationIntelligenceReported,
  DomainAnalyzed,
  BusinessAnalyzed,
  WorkflowAnalyzed,
  FeatureCatalogBuilt,
  ModuleAnalyzed,
  ServiceAnalyzed,
  IntegrationAnalyzed,
  OrganizationAnalyzed,
  ApplicationSummaryBuilt,
  ApplicationKnowledgeReused,
  ResourceSelectionCompleted,
  ResourceSelectionFailed,
  FallbackTriggered,
  ProviderHealthRecorded,
  ProviderSelected,
  ProviderUnavailable,
  ModelRejected,
  BenchmarkUpdated,
  PreferenceChanged,
  CatalogUpdated,
] as const
