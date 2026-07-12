export * as CollaborationResultTypes from "./collaboration-result"

import type { ConsensusReport } from "../reasoning/specialist-consensus"

export type CollaborationPolicyType =
  | "fastest-consensus"
  | "highest-confidence"
  | "maximum-verification"
  | "architecture-first"
  | "repository-first"
  | "documentation-first"
  | "balanced"
  | "cost-optimized"
  | "latency-optimized"
  | "planning-intensive"

export interface CollaborationMessage {
  readonly from: string
  readonly to: string
  readonly type: string
  readonly content: string
  readonly timestamp: number
  readonly confidence: number | undefined
}

export interface CollaborationSessionData {
  readonly sessionID: string
  readonly startedAt: number
  readonly completedAt: number | undefined
  readonly participants: readonly string[]
  readonly assignedModels: Readonly<Record<string, string>>
  readonly strategy: CollaborationPolicyType
  readonly roundCount: number
  readonly discussionHistory: readonly CollaborationMessage[]
  readonly knowledgeExchanged: readonly string[]
  readonly reviewHistory: readonly string[]
  readonly consensusState: "pending" | "in-progress" | "reached" | "conflicted" | "failed"
  readonly unresolvedQuestions: readonly string[]
}

export interface PeerReviewRecord {
  readonly reviewerID: string
  readonly targetID: string
  readonly verdict: "approved" | "changes-requested" | "needs-escalation" | "failed"
  readonly findings: readonly string[]
  readonly recommendation: string | undefined
  readonly confidence: number
  readonly timestamp: number
}

export interface DetectedConflict {
  readonly id: string
  readonly between: readonly string[]
  readonly issue: string
  readonly evidence: readonly string[]
}

export interface ResolvedConflict {
  readonly id: string
  readonly resolution: string
  readonly resolvedBy: string
}

export interface ConflictReport {
  readonly detected: readonly DetectedConflict[]
  readonly resolved: readonly ResolvedConflict[]
  readonly unresolved: readonly string[]
  readonly recommendations: readonly string[]
}

export interface ScoreboardEntry {
  readonly specialistID: string
  readonly name: string
  readonly participation: number
  readonly contributions: number
  readonly acceptedRecommendations: number
  readonly rejectedRecommendations: number
  readonly reviewAccuracy: number
  readonly consensusParticipation: number
  readonly reusableKnowledge: number
  readonly reliabilityScore: number
}

export interface Scoreboard {
  readonly entries: readonly ScoreboardEntry[]
  readonly topContributor: string | undefined
  readonly averageReliability: number
}

export interface SharedArtifact {
  readonly specialistID: string
  readonly findings: readonly string[]
  readonly observations: readonly string[]
  readonly assumptions: readonly string[]
  readonly recommendations: readonly string[]
  readonly unresolvedIssues: readonly string[]
  readonly confidence: number
  readonly timestamp: number
}

export interface SharedWorkspaceState {
  readonly artifacts: Readonly<Record<string, SharedArtifact>>
  readonly consumedBy: Readonly<Record<string, readonly string[]>>
  readonly usageCount: number
}

export interface CollaborationMetrics {
  readonly collaborationRounds: number
  readonly peerReviews: number
  readonly consensusDurationMs: number
  readonly conflictResolutionCount: number
  readonly knowledgeExchanges: number
  readonly sharedWorkspaceUsage: number
  readonly collaborationReuse: number
  readonly collaborationEfficiency: number
}

export interface CollaborationResult {
  readonly session: CollaborationSessionData
  readonly policy: CollaborationPolicyType
  readonly consensus: ConsensusReport | undefined
  readonly peerReviews: readonly PeerReviewRecord[]
  readonly conflicts: ConflictReport
  readonly scoreboard: Scoreboard
  readonly sharedWorkspace: SharedWorkspaceState
  readonly metrics: CollaborationMetrics
}
