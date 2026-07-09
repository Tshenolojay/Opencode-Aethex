export * as SpecialistProfiles from "./profiles"

export interface SpecialistContract {
  readonly requires: readonly string[]
  readonly consumes: readonly string[]
  readonly produces: readonly string[]
  readonly provides: readonly string[]
  readonly validates: readonly string[]
  readonly reviews: readonly string[]
  readonly approves: readonly string[]
  readonly dependsOn: readonly string[]
  readonly canExecuteInParallel: boolean
  readonly canExecuteSequentially: boolean
  readonly canSkip: boolean
  readonly canReuse: boolean
  readonly canRetry: boolean
  readonly canEscalate: boolean
}

export interface SpecialistLifecycle {
  readonly planning: readonly string[]
  readonly preparation: readonly string[]
  readonly execution: readonly string[]
  readonly validation: readonly string[]
  readonly knowledgeProduction: readonly string[]
  readonly review: readonly string[]
  readonly completion: readonly string[]
  readonly reuse: readonly string[]
  readonly recovery: readonly string[]
  readonly cancellation: readonly string[]
  readonly failure: readonly string[]
  readonly timeout: readonly string[]
}

export interface SpecialistDecisionRules {
  readonly canRecommendContinue: boolean
  readonly canRecommendRetry: boolean
  readonly canRecommendEscalate: boolean
  readonly canRecommendStop: boolean
  readonly canRecommendCollectMoreKnowledge: boolean
  readonly canRecommendReduceContext: boolean
  readonly canRecommendExpandContext: boolean
  readonly canRecommendRunVerification: boolean
  readonly canRecommendRunDocumentationReview: boolean
  readonly canRecommendRunArchitectureReview: boolean
  readonly canRecommendRunDependencyReview: boolean
  readonly canRecommendRunSearch: boolean
  readonly canRecommendRunPlanning: boolean
}

export interface SpecialistModelRequirements {
  readonly preferredReasoningModel: string | undefined
  readonly preferredSearchModel: string | undefined
  readonly preferredLongContextModel: string | undefined
  readonly preferredFastModel: string | undefined
  readonly preferredCheapModel: string | undefined
  readonly preferredMultimodalModel: string | undefined
  readonly preferredLatencyMs: number | undefined
  readonly preferredCostPerToken: number | undefined
  readonly preferredQualityScore: number | undefined
  readonly preferredContextTokens: number | undefined
  readonly requiresStreaming: boolean | undefined
  readonly requiresVerification: boolean | undefined
  readonly requiresSearch: boolean | undefined
  readonly requiresPlanning: boolean | undefined
}

export interface SpecialistProfile {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly purpose: string
  readonly mission: string | undefined
  readonly primaryObjective: string | undefined
  readonly responsibilities: string | undefined
  readonly requiredCapabilities: readonly string[]
  readonly preferredKnowledge: readonly string[]
  readonly knowledgeSources: readonly string[] | undefined
  readonly executionPriority: number
  readonly supportsParallelExecution: boolean
  readonly contract: SpecialistContract
  readonly lifecycle: SpecialistLifecycle | undefined
  readonly decisionRules: SpecialistDecisionRules | undefined
  readonly modelRequirements: SpecialistModelRequirements | undefined
  readonly expertise: readonly string[] | undefined
  readonly produces: readonly string[] | undefined
  readonly consumes: readonly string[] | undefined
  readonly requires: readonly string[] | undefined
  readonly preferredCapabilities: readonly string[] | undefined
  readonly optionalCapabilities: readonly string[] | undefined
  readonly secondaryCapabilities: readonly string[] | undefined
  readonly fallbackCapabilities: readonly string[] | undefined
  readonly specialistStrengths: readonly string[] | undefined
  readonly specialistWeaknesses: readonly string[] | undefined
  readonly specialistPreferences: readonly string[] | undefined
  readonly maximumContext: number | undefined
  readonly priorityWeight: number | undefined
  readonly confidenceWeight: number | undefined
  readonly executionCost: number | undefined
  readonly expectedRuntimeMs: number | undefined
  readonly recoveryStrategy: string | undefined
  readonly retryPolicy: string | undefined
  readonly timeoutPolicy: string | undefined
  readonly maxRetries: number | undefined
  readonly timeoutMs: number | undefined
  readonly reviewRequirements: readonly string[] | undefined
  readonly reviewResponsibilities: readonly string[] | undefined
  readonly approvalRequirements: readonly string[] | undefined
  readonly memoryRequirements: readonly string[] | undefined
  readonly cachePolicy?: string
  readonly preferredExecutionStrategy?: string
  readonly preferredModelCharacteristics?: readonly string[]
  readonly primaryCapabilities?: readonly string[]
  readonly minimumCapabilities?: readonly string[]
  readonly collaborationRules?: readonly string[]
  readonly validationRules: readonly string[] | undefined
  readonly metrics: readonly string[] | undefined
  readonly diagnostics: readonly string[] | undefined
}

import { profile as SearchProfile } from "./search-specialist"
import { profile as RepositoryProfile } from "./repository-specialist"
import { profile as DependencyProfile } from "./dependency-specialist"
import { profile as DocumentationProfile } from "./documentation-specialist"
import { profile as ArchitectureProfile } from "./architecture-specialist"
import { profile as VerificationProfile } from "./verification-specialist"
import { profile as ContextProfile } from "./context-specialist"
import { profile as PlanningProfile } from "./planning-specialist"

export const DefaultSpecialists: readonly SpecialistProfile[] = [
  SearchProfile,
  RepositoryProfile,
  DependencyProfile,
  DocumentationProfile,
  ArchitectureProfile,
  VerificationProfile,
  ContextProfile,
  PlanningProfile,
]
