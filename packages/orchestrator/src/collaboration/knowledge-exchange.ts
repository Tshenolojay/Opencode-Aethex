export { KnowledgeExchange } from "../knowledge/knowledge-exchange"

import { Effect } from "effect"
import { KnowledgeExchange } from "../knowledge/knowledge-exchange"

export type KnowledgeArtifactType =
  | "repository-finding"
  | "dependency-finding"
  | "architecture-observation"
  | "documentation-insight"
  | "planning-recommendation"
  | "verification-note"
  | "workflow-suggestion"
  | "reasoning-summary"

let counter = 0
function nextID(): string {
  return `kc-${Date.now()}-${counter++}`
}

/**
 * Publish a structured advisory artifact exchanged between specialists.
 * Never exchanges prompts, never executes tools — only structured advisory knowledge.
 */
export const publishArtifact = (
  ownerID: string,
  type: KnowledgeArtifactType,
  content: string,
  confidence: number,
  provenance: readonly string[],
) =>
  Effect.flatMap(KnowledgeExchange.Service, (service) =>
    service.publish({
      id: nextID(),
      type,
      content,
      source: "collaboration",
      confidence,
      timestamp: Date.now(),
      owner: ownerID,
      provenance,
      dependencies: [],
    }))

export const shareRepositoryFinding = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "repository-finding", content, confidence, [ownerID])

export const shareDependencyFinding = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "dependency-finding", content, confidence, [ownerID])

export const shareArchitectureObservation = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "architecture-observation", content, confidence, [ownerID])

export const shareDocumentationInsight = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "documentation-insight", content, confidence, [ownerID])

export const sharePlanningRecommendation = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "planning-recommendation", content, confidence, [ownerID])

export const shareVerificationNote = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "verification-note", content, confidence, [ownerID])

export const shareWorkflowSuggestion = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "workflow-suggestion", content, confidence, [ownerID])

export const shareReasoningSummary = (ownerID: string, content: string, confidence: number) =>
  publishArtifact(ownerID, "reasoning-summary", content, confidence, [ownerID])

export const queryArtifacts = (types: readonly KnowledgeArtifactType[], confidenceMin: number, owners?: readonly string[]) =>
  Effect.flatMap(KnowledgeExchange.Service, (service) =>
    service.query({ types, confidenceMin, owners, since: undefined }))
