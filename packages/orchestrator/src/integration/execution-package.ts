export * as ExecutionPackage from "./execution-package"

export type RiskSeverity = "low" | "medium" | "high"
export type AdviceCategory =
  | "workflow"
  | "dependency"
  | "architecture"
  | "documentation"
  | "verification"
  | "performance"
  | "quality"
  | "context"
  | "tool"
export type AdvicePriority = "low" | "medium" | "high"
export type ExecutionPriorityLevel = "low" | "medium" | "high"

export interface ExecutionRisk {
  readonly risk: string
  readonly severity: RiskSeverity
  readonly category: "dependency" | "architecture" | "verification" | "performance" | "quality" | "workflow" | "context"
}

export interface ExecutionRecommendation {
  readonly recommendation: string
  readonly category: AdviceCategory
  readonly priority: AdvicePriority
}

export interface ExecutionConstraint {
  readonly constraint: string
  readonly type: "hard" | "soft"
}

export interface ToolAdvice {
  readonly suggestedTools: readonly string[]
  readonly preferredExecutionOrder: readonly string[]
  readonly parallelSafeGroups: readonly (readonly string[])[]
  readonly verificationTools: readonly string[]
  readonly avoidTools: readonly string[]
  readonly toolPriority: Readonly<Record<string, number>>
  readonly toolReasoning: string | undefined
}

export interface StreamingMetadata {
  readonly planningProgress: number
  readonly executionProgress: number
  readonly knowledgeProgress: number
  readonly completedStages: readonly string[]
  readonly remainingStages: readonly string[]
  readonly currentStage: string | undefined
}

export interface ExecutionIntelligence {
  readonly executionObjectives: readonly string[] | undefined
  readonly executionRisks: readonly ExecutionRisk[] | undefined
  readonly executionRecommendations: readonly ExecutionRecommendation[] | undefined
  readonly executionConstraints: readonly ExecutionConstraint[] | undefined
  readonly reasoningHints: readonly string[] | undefined
  readonly workflowAdvice: string | undefined
  readonly toolAdvice: ToolAdvice | undefined
  readonly architectureAdvice: string | undefined
  readonly dependencyAdvice: string | undefined
  readonly documentationAdvice: string | undefined
  readonly verificationAdvice: string | undefined
  readonly performanceAdvice: string | undefined
  readonly qualityAdvice: string | undefined
  readonly executionPriority: ExecutionPriorityLevel | undefined
  readonly streamingMetadata: StreamingMetadata | undefined
}

export type ConsensusLevel = "strong" | "moderate" | "weak" | "conflicted"

export interface SpecialistConsensus {
  readonly overallConsensus: ConsensusLevel
  readonly overallConfidence: number
  readonly agreements: readonly string[]
  readonly disagreements: readonly string[]
  readonly missingEvidence: readonly string[]
  readonly confidenceTrends: readonly string[]
  readonly confidenceGaps: readonly string[]
  readonly verificationGaps: readonly string[]
  readonly unresolvedQuestions: readonly string[]
  readonly recommendations: readonly string[]
}

export interface ExecutionNarrative {
  readonly mission: string | undefined
  readonly objective: string | undefined
  readonly taskSummary: string | undefined
  readonly repositoryFindings: string | undefined
  readonly architectureFindings: string | undefined
  readonly dependencyFindings: string | undefined
  readonly documentationFindings: string | undefined
  readonly verificationFindings: string | undefined
  readonly specialistConsensus: string | undefined
  readonly risks: readonly string[] | undefined
  readonly constraints: readonly string[] | undefined
  readonly unknowns: readonly string[] | undefined
  readonly criticalFiles: readonly string[] | undefined
  readonly criticalModules: readonly string[] | undefined
  readonly recommendedWorkflow: string | undefined
  readonly executionStrategy: string | undefined
  readonly expectedOutcome: string | undefined
  readonly confidenceSummary: string | undefined
  readonly teamOverview: string | undefined
  readonly assignedSpecialists: readonly string[] | undefined
  readonly taskAllocation: readonly string[] | undefined
  readonly collaborationSummary: string | undefined
  readonly reviewSummary: string | undefined
  readonly capabilitySummary: string | undefined
  readonly remainingQuestions: readonly string[] | undefined
  readonly fullText: string
}

export interface DecisionRecord {
  readonly decision: boolean
  readonly reason: string
  readonly confidence: number
}

export interface ReasoningDecisionSummary {
  readonly reuseRepositoryReasoning: DecisionRecord
  readonly showVerificationAdvice: DecisionRecord
  readonly prioritizeArchitecture: DecisionRecord
  readonly includeDependencyReasoning: DecisionRecord
  readonly runContextCompression: DecisionRecord
  readonly performPlanningReuse: DecisionRecord
}

export interface ReasoningMetadata {
  readonly reasoningBuildTimeMs: number
  readonly consensusGenerationTimeMs: number
  readonly narrativeGenerationTimeMs: number
  readonly decisionEngineTimeMs: number
  readonly reusedReasoning: boolean
  readonly compressedReasoning: boolean
}

export interface TeamMember {
  readonly specialistID: string
  readonly name: string
  readonly role: string
  readonly active: boolean
  readonly capabilities: readonly string[]
  readonly confidence: number
  readonly priority: number
  readonly knowledgeRequests: readonly string[] | undefined
  readonly sharedKnowledge: readonly string[] | undefined
  readonly reviewsCompleted: readonly string[] | undefined
  readonly reviewRequests: readonly string[] | undefined
  readonly challengesRaised: readonly string[] | undefined
  readonly conflictsDeclared: readonly string[] | undefined
  readonly confidenceVotes: Readonly<Record<string, number>> | undefined
  readonly escalations: readonly string[] | undefined
  readonly assignedTasks: readonly string[] | undefined
  readonly completions: readonly string[] | undefined
}

export interface VirtualTeam {
  readonly teamID: string
  readonly members: readonly TeamMember[]
  readonly activeParticipants: readonly string[]
  readonly collaborationMetadata: Readonly<Record<string, string>>
  readonly knowledgeSharing: readonly { from: string; to: string; knowledge: string }[] | undefined
  readonly pendingRequests: readonly { from: string; to: string; request: string }[] | undefined
  readonly resolvedConflicts: readonly { between: readonly string[]; resolved: boolean; resolution: string }[] | undefined
  readonly confidenceDistribution: Readonly<Record<string, number>> | undefined
  readonly escalationChain: readonly string[] | undefined
  readonly consensusStatus: "pending" | "in-progress" | "reached" | "failed" | undefined
}

export type TaskCategory =
  | "repository-analysis"
  | "refactoring"
  | "documentation"
  | "verification"
  | "planning"
  | "architecture-review"
  | "dependency-analysis"
  | "general"

export interface TaskUnit {
  readonly id: string
  readonly title: string
  readonly category: TaskCategory
  readonly complexity: number
  readonly dependencies: readonly string[]
  readonly parallelGroup: number | undefined
  readonly requiredCapabilities: readonly string[]
}

export interface TaskGraph {
  readonly units: readonly TaskUnit[]
  readonly dependencies: readonly { from: string; to: string }[]
  readonly parallelGroups: readonly (readonly string[])[]
  readonly estimatedComplexity: number
}

export interface SpecialistOwnership {
  readonly specialistID: string
  readonly taskIDs: readonly string[]
  readonly confidence: number
}

export interface WorkAssignment {
  readonly taskID: string
  readonly specialistID: string
  readonly executionPriority: number
  readonly rationale: string
}

export interface WorkAssignments {
  readonly assignments: readonly WorkAssignment[]
  readonly ownership: readonly SpecialistOwnership[]
  readonly priority: "low" | "medium" | "high"
}

export type KnowledgeSourceType =
  | "repository"
  | "documentation"
  | "conversation"
  | "tool-history"
  | "dependency"
  | "architecture"
  | "verification"
  | "context"

export interface KnowledgeSourceDescriptor {
  readonly type: KnowledgeSourceType
  readonly description: string
  readonly confidence: number
  readonly required: boolean
}

export interface ConnectorRequest {
  readonly sourceType: KnowledgeSourceType
  readonly specialistID: string | undefined
  readonly priority: number
  readonly filters: Readonly<Record<string, string>> | undefined
}

export interface ConnectorPlan {
  readonly requests: readonly ConnectorRequest[]
  readonly totalPriority: number
  readonly hasRequiredSources: boolean
}

export interface ConnectorResult {
  readonly sourceType: KnowledgeSourceType
  readonly status: "prepared" | "skipped" | "missing" | "cached"
  readonly metadata: Readonly<Record<string, string>>
  readonly confidence: number
  readonly error: string | undefined
}

export interface ConnectorMetadata {
  readonly plannerTimeMs: number
  readonly coordinatorTimeMs: number
  readonly reuseCount: number
  readonly cacheHits: number
  readonly cacheMisses: number
}

export interface SpecialistWorkspaceData {
  readonly specialistID: string
  readonly findings: readonly string[]
  readonly evidence: readonly string[]
  readonly confidence: number
  readonly risks: readonly string[]
  readonly openQuestions: readonly string[]
  readonly recommendations: readonly string[]
  readonly producedKnowledge: readonly string[]
  readonly consumedKnowledge: readonly string[]
  readonly completedTasks: readonly string[]
  readonly pendingTasks: readonly string[]
  readonly requestedSources: readonly KnowledgeSourceType[] | undefined
  readonly receivedSources: readonly KnowledgeSourceType[] | undefined
  readonly missingSources: readonly KnowledgeSourceType[] | undefined
  readonly reusableSources: readonly KnowledgeSourceType[] | undefined
  readonly connectorConfidence: number | undefined
}

export interface WorkspaceSummaries {
  readonly summaries: Readonly<Record<string, string>>
  readonly requestedSources: readonly KnowledgeSourceType[] | undefined
  readonly receivedSources: readonly KnowledgeSourceType[] | undefined
  readonly missingSources: readonly KnowledgeSourceType[] | undefined
  readonly reusableSources: readonly KnowledgeSourceType[] | undefined
  readonly connectorConfidence: number | undefined
}

export interface TeamDiscussion {
  readonly agreements: readonly string[]
  readonly disagreements: readonly string[]
  readonly missingEvidence: readonly string[]
  readonly unresolvedQuestions: readonly string[]
  readonly confidenceDifferences: readonly string[]
  readonly recommendations: readonly string[]
}

export interface ReviewStage {
  readonly stage: string
  readonly status: "pending" | "in-review" | "completed"
  readonly findings: readonly string[]
  readonly recommendation: string | undefined
}

export interface ReviewPipeline {
  readonly stages: readonly ReviewStage[]
  readonly finalNarrative: string | undefined
}

export interface CapabilityAdvertisement {
  readonly specialistID: string
  readonly provides: readonly string[]
  readonly consumes: readonly string[]
  readonly requires: readonly string[]
  readonly optionalCapabilities: readonly string[]
  readonly preferredCapabilities: readonly string[]
  readonly supportedKnowledgeSources: readonly KnowledgeSourceType[] | undefined
}

export interface CapabilityMarketplace {
  readonly advertisements: readonly CapabilityAdvertisement[]
}

export interface TeamPlan {
  readonly objective: string
  readonly teamMembers: readonly string[]
  readonly taskAllocations: readonly { taskID: string; specialistID: string }[]
  readonly workflowOrder: readonly string[]
  readonly consensusPrepared: boolean
  readonly reviewStages: readonly string[]
  readonly connectorRequests: readonly ConnectorRequest[] | undefined
}

import { Schema } from "effect"
import { TaskClassification as TaskClassificationSchema, type ClassificationResult } from "../classifier/schema"
type _TaskClassification = Schema.Schema.Type<typeof TaskClassificationSchema>
import type { ConfidenceLevel, ConfidenceScore } from "../types/confidence"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { DispatchPlan, SpecialistPlan } from "../dispatcher/dispatcher"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { Graph as ExecutionGraph } from "../planner/execution-graph"
import type { Metrics } from "../runtime/runtime-metrics"
import type { RepositoryAnalysis } from "../intelligence/repository-intelligence"
import type { DependencyAnalysis } from "../intelligence/dependency-intelligence"
import type { ArchitectureAnalysis } from "../intelligence/architecture-intelligence"
import type { DocumentationAnalysis } from "../intelligence/documentation-intelligence"
import type { VerificationAnalysis } from "../intelligence/verification-intelligence"
import type { ContextQualityReport } from "../intelligence/context-intelligence"
import type { AgentHints } from "./agent-hints"
import type { AgentSelectionAdvice } from "./agent-selection-advice"
import type { PromptAugmentation } from "./prompt-augmentation"
import type { AgentContextProfile } from "./agent-context"
import type { ApplicationProfile } from "../application/application-profile"
import type { ApplicationSummary, WorkflowCatalog, CapabilityCatalog, ServiceCatalog, ModuleCatalog, IntelligenceReport } from "../application/application-intelligence"
import type { CollaborationResult } from "./collaboration-result"

export interface RoutingMetadata {
  readonly selectedProviderID: string | undefined
  readonly selectedModelID: string | undefined
  readonly fallbackProviderID: string | undefined
  readonly fallbackModelID: string | undefined
  readonly tertiaryProviderID: string | undefined
  readonly tertiaryModelID: string | undefined
  readonly routingStrategy: string | undefined
  readonly routingPolicy: string | undefined
  readonly selectionConfidence: number | undefined
  readonly selectionReasoning: readonly string[] | undefined
  readonly capabilityFitScore: number | undefined
  readonly estimatedCostPerToken: number | undefined
  readonly estimatedCost: number | undefined
  readonly estimatedContext: number | undefined
  readonly estimatedTokens: number | undefined
  readonly estimatedLatencyMs: number | undefined
  readonly providerHealthScore: number | undefined
  readonly providerHealthSnapshot: Readonly<Record<string, unknown>> | undefined
  readonly benchmarkSummary: Readonly<Record<string, unknown>> | undefined
}

export interface ExecutionPackage {
  readonly sessionID: string
  readonly timestamp: number

  readonly taskClassification: _TaskClassification
  readonly classifications: readonly ClassificationResult[]
  readonly confidence: ConfidenceLevel
  readonly confidenceScore: ConfidenceScore | undefined

  readonly capabilityPlan: CapabilityPlan | undefined
  readonly specialistPlan: SpecialistPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly dispatchPlan: DispatchPlan | undefined
  readonly planningPolicy: PlanningPolicy | undefined
  readonly executionGraph: ExecutionGraph | undefined

  readonly knowledgeBundle: KnowledgeBundle

  readonly repositoryIntelligence: RepositoryAnalysis | undefined
  readonly dependencyIntelligence: DependencyAnalysis | undefined
  readonly architectureIntelligence: ArchitectureAnalysis | undefined
  readonly documentationIntelligence: DocumentationAnalysis | undefined
  readonly verificationIntelligence: VerificationAnalysis | undefined
  readonly contextIntelligence: ContextQualityReport | undefined

  readonly conversationSummary: string | undefined
  readonly modelRecommendation: string | undefined

  readonly runtimeMetrics: Metrics | undefined
  readonly executionNotes: readonly string[] | undefined

  readonly agentSelectionAdvice: AgentSelectionAdvice | undefined
  readonly agentContextProfile: AgentContextProfile | undefined
  readonly agentHints: AgentHints | undefined

  readonly promptAugmentation: PromptAugmentation | undefined

  readonly executionIntelligence: ExecutionIntelligence | undefined
  readonly compressedContext: string | undefined

  readonly executionNarrative: ExecutionNarrative | undefined
  readonly specialistConsensus: SpecialistConsensus | undefined
  readonly reasoningSummary: string | undefined
  readonly reasoningConfidence: number | undefined
  readonly reasoningHistory: readonly string[] | undefined
  readonly decisionSummary: ReasoningDecisionSummary | undefined
  readonly reasoningMetadata: ReasoningMetadata | undefined

  readonly virtualTeam: VirtualTeam | undefined
  readonly teamPlan: TeamPlan | undefined
  readonly taskGraph: TaskGraph | undefined
  readonly workAssignments: WorkAssignments | undefined
  readonly teamDiscussion: TeamDiscussion | undefined
  readonly reviewPipeline: ReviewPipeline | undefined
  readonly capabilityMarketplace: CapabilityMarketplace | undefined
  readonly workspaceSummaries: WorkspaceSummaries | undefined

  readonly connectorPlan: ConnectorPlan | undefined
  readonly knowledgeSources: readonly KnowledgeSourceDescriptor[] | undefined
  readonly connectorResults: readonly ConnectorResult[] | undefined
  readonly connectorMetadata: ConnectorMetadata | undefined
  readonly reusableKnowledgeSources: readonly KnowledgeSourceType[] | undefined

  readonly applicationProfile: ApplicationProfile | undefined
  readonly applicationSummary: ApplicationSummary | undefined
  readonly workflowCatalog: WorkflowCatalog | undefined
  readonly capabilityCatalog: CapabilityCatalog | undefined
  readonly serviceCatalog: ServiceCatalog | undefined
  readonly moduleCatalog: ModuleCatalog | undefined
  readonly intelligenceReport: IntelligenceReport | undefined

  readonly collaboration: CollaborationResult | undefined

  readonly routingMetadata: RoutingMetadata | undefined
}

export function empty(sessionID: string): ExecutionPackage {
  return {
    sessionID,
    timestamp: Date.now(),
    taskClassification: { type: "general-chat", complexity: 0, requiresContext: true, requiresSearch: false, requiresDependencyGraph: false, requiresVerification: false, confidence: "high" },
    classifications: [],
    confidence: "high",
    confidenceScore: undefined,
    capabilityPlan: undefined,
    specialistPlan: undefined,
    knowledgePlan: undefined,
    dispatchPlan: undefined,
    planningPolicy: undefined,
    executionGraph: undefined,
    knowledgeBundle: {
      taskType: "general-chat",
      repositorySummary: undefined,
      relevantFiles: [],
      relevantSymbols: [],
      searchResults: [],
      dependencyGraph: [],
      architectureNotes: undefined,
      architectureSummary: undefined,
      externalReferences: [],
      verificationResults: [],
      contextSummary: undefined,
      planMetadata: undefined,
      knowledgeRequirements: undefined,
      searchTargets: undefined,
      verificationTargets: undefined,
      executionNotes: undefined,
      documentation: undefined,
      configuration: undefined,
      projectStructure: undefined,
      conversationSummary: undefined,
      toolHistory: undefined,
      verificationNotes: undefined,
      searchResultsExternal: undefined,
      externalKnowledge: undefined,
      dependencies: undefined,
      knowledgeMeta: undefined,
    },
    repositoryIntelligence: undefined,
    dependencyIntelligence: undefined,
    architectureIntelligence: undefined,
    documentationIntelligence: undefined,
    verificationIntelligence: undefined,
    contextIntelligence: undefined,
    conversationSummary: undefined,
    modelRecommendation: undefined,
    runtimeMetrics: undefined,
    executionNotes: undefined,
    agentSelectionAdvice: undefined,
    agentContextProfile: undefined,
    agentHints: undefined,
    promptAugmentation: undefined,
    executionIntelligence: undefined,
    compressedContext: undefined,
    executionNarrative: undefined,
    specialistConsensus: undefined,
    reasoningSummary: undefined,
    reasoningConfidence: undefined,
    reasoningHistory: undefined,
    decisionSummary: undefined,
    reasoningMetadata: undefined,
    virtualTeam: undefined,
    teamPlan: undefined,
    taskGraph: undefined,
    workAssignments: undefined,
    teamDiscussion: undefined,
    reviewPipeline: undefined,
    capabilityMarketplace: undefined,
    workspaceSummaries: undefined,
    connectorPlan: undefined,
    knowledgeSources: undefined,
    connectorResults: undefined,
    connectorMetadata: undefined,
    reusableKnowledgeSources: undefined,
    applicationProfile: undefined,
    applicationSummary: undefined,
    workflowCatalog: undefined,
    capabilityCatalog: undefined,
    serviceCatalog: undefined,
    moduleCatalog: undefined,
    intelligenceReport: undefined,
    collaboration: undefined,
    routingMetadata: undefined,
  }
}
