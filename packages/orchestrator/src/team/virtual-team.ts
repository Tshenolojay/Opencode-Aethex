export * as VirtualTeam from "./virtual-team"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { VirtualTeam as TeamState, TeamMember } from "../integration/execution-package"
import type { Capability } from "../types/capability"
import { SpecialistRegistry } from "../specialists/registry"
import { SpecialistConversation } from "../session/specialist-conversation"
import type { MessageType } from "../session/specialist-session"

export interface DelegateTask {
  readonly from: string
  readonly to: string
  readonly task: string
  readonly deadline: number | undefined
}

export interface PeerReviewRequest {
  readonly from: string
  readonly to: string
  readonly scope: string
  readonly evidence: readonly string[]
}

export interface EscalationRecord {
  readonly from: string
  readonly to: string
  readonly issue: string
  readonly reason: string
  readonly resolved: boolean
  readonly resolution: string | undefined
}

export interface Interface {
  readonly build: (pkg: ExecutionPackage) => Effect.Effect<TeamState>
  readonly delegateTask: (teamID: string, delegation: DelegateTask) => Effect.Effect<void>
  readonly requestPeerReview: (teamID: string, review: PeerReviewRequest) => Effect.Effect<void>
  readonly escalate: (teamID: string, escalation: EscalationRecord) => Effect.Effect<void>
  readonly resolveEscalation: (teamID: string, escalation: string, resolution: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/VirtualTeam") {}

const build: Interface["build"] = Effect.fn("VirtualTeam.build")(function* (pkg) {
  const registry = yield* SpecialistRegistry.Service
  const allSpecialists = yield* registry.getAllSpecialists()

  const classification = pkg.taskClassification
  const requiredCaps = new Set(pkg.capabilityPlan?.required ?? [])
  const narrative = pkg.executionNarrative

  const members: TeamMember[] = allSpecialists.map((s) => {
    const p = s.profile
    const relevant = p.requiredCapabilities.filter((c) => requiredCaps.has(c as Capability)).length
    const taskRelevant =
      (classification.requiresSearch && p.requiredCapabilities.includes("search")) ||
      (classification.requiresDependencyGraph && p.requiredCapabilities.includes("analysis"))
    const active = relevant > 0 || taskRelevant || classification.type !== "general-chat"
    const confidence = relevant > 0 ? Math.min(1, 0.5 + relevant * 0.15) : 0.4
    const contract = s.getContract()
    return {
      specialistID: s.id,
      name: p.name,
      role: p.purpose,
      active,
      capabilities: p.requiredCapabilities,
      confidence,
      priority: p.executionPriority,
      knowledgeRequests: active ? contract.consumes.map((c) => `request:${c}`) : undefined,
      sharedKnowledge: active ? contract.produces.map((p) => `shares:${p}`) : undefined,
      reviewsCompleted: undefined,
      reviewRequests: contract.reviews.length > 0 ? contract.reviews.map((r) => `needs-review:${r}`) : undefined,
      challengesRaised: undefined,
      conflictsDeclared: undefined,
      confidenceVotes: undefined,
      escalations: contract.canEscalate ? [] : undefined,
      assignedTasks: undefined,
      completions: undefined,
    }
  })

  const activeParticipants = members.filter((m) => m.active).map((m) => m.specialistID)

  const knowledgeSharing = members
    .filter((m) => m.active && m.sharedKnowledge && m.sharedKnowledge.length > 0)
    .flatMap((m) =>
      (m.sharedKnowledge ?? []).map((k) => ({
        from: m.specialistID,
        to: "all",
        knowledge: k,
      })),
    )

  const collaborationMetadata: Record<string, string> = {
    teamSize: String(members.length),
    activeCount: String(activeParticipants.length),
    taskType: classification.type,
    consensusPrepared: String(!!pkg.specialistConsensus),
    reviewStages: String(pkg.reviewPipeline?.stages.length ?? 0),
  }

  const confidenceEntries = activeParticipants.map((id) => {
    const member = members.find((m) => m.specialistID === id)
    return [id, member?.confidence ?? 0.5] as const
  })

  return {
    teamID: `team-${pkg.sessionID}`,
    members,
    activeParticipants,
    collaborationMetadata,
    knowledgeSharing: knowledgeSharing.length > 0 ? knowledgeSharing : undefined,
    pendingRequests: undefined,
    resolvedConflicts: undefined,
    confidenceDistribution: Object.fromEntries(confidenceEntries),
    escalationChain: undefined,
    consensusStatus: narrative?.specialistConsensus ? "reached" : "pending",
  } as TeamState
}) as Interface["build"]

const delegateTask: Interface["delegateTask"] = Effect.fn("VirtualTeam.delegateTask")(function* (teamID, delegation) {
  const conversation = yield* SpecialistConversation.Service
  yield* conversation.startThread([delegation.from, delegation.to])
}) as Interface["delegateTask"]

const requestPeerReview: Interface["requestPeerReview"] = Effect.fn("VirtualTeam.requestPeerReview")(function* (teamID, review) {
  const conversation = yield* SpecialistConversation.Service
  yield* conversation.startThread([review.from, review.to])
}) as Interface["requestPeerReview"]

const escalate: Interface["escalate"] = Effect.fn("VirtualTeam.escalate")(function* (teamID, escalation) {
  const conversation = yield* SpecialistConversation.Service
  yield* conversation.startThread([escalation.from, escalation.to])
}) as Interface["escalate"]

const resolveEscalation: Interface["resolveEscalation"] = Effect.fn("VirtualTeam.resolveEscalation")(function* (teamID, escalation, resolution) {
  const conversation = yield* SpecialistConversation.Service
  const threads = yield* conversation.listThreads()
  const thread = threads.find((t) => t.messages.some((m) => m.content.includes(escalation)))
  if (thread) {
    yield* conversation.resolveThread(thread.threadID, resolution)
  }
}) as Interface["resolveEscalation"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build, delegateTask, requestPeerReview, escalate, resolveEscalation })
  }),
)

export { layer }
