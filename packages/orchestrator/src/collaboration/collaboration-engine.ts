export * as CollaborationEngine from "./collaboration-engine"

import { Context, Effect, Layer } from "effect"
import { CollaborationPolicy } from "./collaboration-policy"
import { CollaborationSession as CollaborationSessionService } from "./collaboration-session"
import { ConsensusEngine } from "./consensus-engine"
import { ConflictResolution } from "./conflict-resolution"
import { DiscussionModerator } from "./discussion-moderator"
import { PeerReviewEngine } from "./peer-review-engine"
import { SharedWorkspace } from "./shared-workspace"
import { SpecialistCoordinator } from "./specialist-coordinator"
import { SpecialistScoreboard } from "./specialist-scoreboard"
import { SpecialistMemory } from "./specialist-memory"
import { ReviewManager } from "./review-manager"
import type { CollaborationMetrics as CollaborationMetricsType } from "../integration/collaboration-result"
import type { CollaborationResult, PeerReviewRecord, SharedWorkspaceState, ConflictReport, Scoreboard } from "../integration/collaboration-result"
import type { ExecutionPackage, SpecialistWorkspaceData, VirtualTeam, WorkspaceSummaries } from "../integration/execution-package"
import type { ConsensusReport, WeightedVote } from "../reasoning/specialist-consensus"

export interface Interface {
  readonly run: (pkg: ExecutionPackage, team: VirtualTeam, workspaces: WorkspaceSummaries, votes: readonly WeightedVote[]) => Effect.Effect<CollaborationResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CollaborationEngine") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const policyService = yield* CollaborationPolicy.Service
    const session = yield* CollaborationSessionService.Service
    const consensus = yield* ConsensusEngine.Service
    const conflicts = yield* ConflictResolution.Service
    const discussion = yield* DiscussionModerator.Service
    const peerReview = yield* PeerReviewEngine.Service
    const workspace = yield* SharedWorkspace.Service
    const coordinator = yield* SpecialistCoordinator.Service
    const scoreboard = yield* SpecialistScoreboard.Service
    const memory = yield* SpecialistMemory.Service
    const reviewManager = yield* ReviewManager.Service

    const run: Interface["run"] = Effect.fn("CollaborationEngine.run")(function* (pkg, team, workspaces, votes) {
      const policy = yield* policyService.recommend(pkg)
      const profile = policyService.getPolicy(policy)!

      yield* session.create(pkg.sessionID, team.activeParticipants, {}, policy)
      yield* memory.initialize(pkg.sessionID)
      yield* coordinator.coordinate(pkg, team, policy)

      yield* workspace.buildFromWorkspaces(
        team.members.map((m) => ({
          specialistID: m.specialistID,
          findings: [m.role],
          evidence: [],
          confidence: m.confidence,
          risks: [],
          openQuestions: [],
          recommendations: [],
          producedKnowledge: m.sharedKnowledge ?? [],
          consumedKnowledge: [],
          completedTasks: [],
          pendingTasks: [],
          requestedSources: undefined,
          receivedSources: undefined,
          missingSources: undefined,
          reusableSources: undefined,
          connectorConfidence: undefined,
        } satisfies SpecialistWorkspaceData)),
      )

      const discussionMessages = yield* discussion.moderate(team, workspaces, `Advisory session: ${pkg.taskClassification.type}`, profile.maxRounds)
      for (const msg of discussionMessages) {
        yield* session.addMessage(pkg.sessionID, msg)
      }

      const consensusReport = yield* consensus.runConsensus(pkg, votes, policy)
      const detectedConflicts = yield* consensus.detectConflicts(pkg, votes)
      const conflictReport = yield* conflicts.analyze(pkg, detectedConflicts)
      yield* session.setConsensus(pkg.sessionID, consensusReport.overallConsensus === "conflicted" ? "conflicted" : "reached")

      const peerReviews = yield* peerReview.runPeerReviews(team)
      for (const r of peerReviews) {
        yield* session.addReview(pkg.sessionID, r.reviewerID)
        yield* memory.recordReview(pkg.sessionID, r.reviewerID, r.targetID, r.verdict)
      }

      const reviewPipeline = yield* reviewManager.manage(pkg, peerReviews)

      yield* session.complete(pkg.sessionID)
      const sessionData = (yield* session.get(pkg.sessionID))!

      const workspaceState = yield* workspace.getAll()
      const score = yield* scoreboard.getScoreboard()

      const metrics: CollaborationMetricsType = {
        collaborationRounds: discussionMessages.length,
        peerReviews: peerReviews.length,
        consensusDurationMs: Date.now(),
        conflictResolutionCount: conflictReport.resolved.length,
        knowledgeExchanges: sessionData.knowledgeExchanged.length,
        sharedWorkspaceUsage: workspaceState.usageCount,
        collaborationReuse: 0,
        collaborationEfficiency: peerReviews.length > 0 ? 1.0 : 0.5,
      }

      return {
        session: sessionData,
        policy,
        consensus: consensusReport,
        peerReviews,
        conflicts: conflictReport,
        scoreboard: score,
        sharedWorkspace: workspaceState,
        metrics,
      } satisfies CollaborationResult
    })

    return Service.of({ run })
  }),
)

export { layer }
