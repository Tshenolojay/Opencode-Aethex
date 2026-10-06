export * as OrchestratorContract from "./service"

import { Schema } from "effect"
import { TaskClassification } from "../classifier/schema"
import type { ConfidenceScore } from "../types/confidence"
import { ConfidenceLevel } from "../types/confidence"
import type { DispatchPlan, SpecialistPlan } from "../dispatcher/dispatcher"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { ExecutionStatus } from "../types/execution-status"
import type { Capability } from "../types/capability"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { Graph } from "../planner/execution-graph"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { RuntimeCatalogSnapshot } from "../catalog"

export interface OrchestrationInput {
  readonly promptText: string
  readonly sessionID: string
  readonly filesAttached: boolean
  readonly conversationLength: number
  readonly repositorySize: number
  readonly contextAvailable: boolean
  readonly previousToolResults: boolean
  readonly sessionMetadata: Record<string, string> | undefined
  readonly assistantResponses: readonly string[] | undefined
  readonly toolResults: readonly string[] | undefined
  readonly projectInfo: string | undefined
  readonly runtimeCatalog: RuntimeCatalogSnapshot | undefined
}

export interface OrchestrationDecision {
  readonly needsOrchestration: boolean
  readonly taskClassification: TaskClassification
  readonly confidence: ConfidenceLevel
  readonly confidenceScore: ConfidenceScore | undefined
  readonly dispatchPlan: DispatchPlan
  readonly knowledgeBundle: KnowledgeBundle
  readonly executionStatus: ExecutionStatus
  readonly skipReason: string | undefined
  readonly selectedCapabilities: readonly Capability[] | undefined
  readonly knowledgeRequirements: readonly string[] | undefined
  readonly executionNotes: readonly string[] | undefined
  readonly specialistPlan: SpecialistPlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly executionGraph: Graph | undefined
  readonly planningPolicy: PlanningPolicy | undefined
}
