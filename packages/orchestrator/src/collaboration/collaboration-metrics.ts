import { Context, Effect, Layer, Ref } from "effect"
import { RuntimeMetrics } from "../runtime/runtime-metrics"
import type { CollaborationMetrics } from "../integration/collaboration-result"

interface InternalState {
  totalCollaborationRounds: number
  totalPeerReviews: number
  totalConsensusDurationMs: number
  totalConflictResolutions: number
  totalKnowledgeExchanges: number
  totalSharedWorkspaceUsage: number
  efficiencySum: number
  efficiencyCount: number
}

export interface AggregatedCollaborationMetrics {
  readonly totalCollaborationRounds: number
  readonly totalPeerReviews: number
  readonly totalConsensusDurationMs: number
  readonly totalConflictResolutions: number
  readonly totalKnowledgeExchanges: number
  readonly totalSharedWorkspaceUsage: number
  readonly averageEfficiency: number
}

export interface Interface {
  readonly recordCollaborationMetrics: (metrics: CollaborationMetrics) => Effect.Effect<void>
  readonly getAggregated: Effect.Effect<AggregatedCollaborationMetrics>
  readonly reset: Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CollaborationMetrics") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const runtimeMetrics = yield* RuntimeMetrics.Service
    const store = yield* Ref.make<InternalState>({
      totalCollaborationRounds: 0,
      totalPeerReviews: 0,
      totalConsensusDurationMs: 0,
      totalConflictResolutions: 0,
      totalKnowledgeExchanges: 0,
      totalSharedWorkspaceUsage: 0,
      efficiencySum: 0,
      efficiencyCount: 0,
    })

    const recordCollaborationMetrics = Effect.fn("CollaborationMetrics.record")(function* (metrics) {
      yield* runtimeMetrics.recordReview()
      yield* Ref.update(store, (s) => ({
        totalCollaborationRounds: s.totalCollaborationRounds + metrics.collaborationRounds,
        totalPeerReviews: s.totalPeerReviews + metrics.peerReviews,
        totalConsensusDurationMs: s.totalConsensusDurationMs + metrics.consensusDurationMs,
        totalConflictResolutions: s.totalConflictResolutions + metrics.conflictResolutionCount,
        totalKnowledgeExchanges: s.totalKnowledgeExchanges + metrics.knowledgeExchanges,
        totalSharedWorkspaceUsage: s.totalSharedWorkspaceUsage + metrics.sharedWorkspaceUsage,
        efficiencySum: s.efficiencySum + metrics.collaborationEfficiency,
        efficiencyCount: s.efficiencyCount + 1,
      }))
    })

    const getAggregated = Effect.map(Ref.get(store), (s) => ({
      totalCollaborationRounds: s.totalCollaborationRounds,
      totalPeerReviews: s.totalPeerReviews,
      totalConsensusDurationMs: s.totalConsensusDurationMs,
      totalConflictResolutions: s.totalConflictResolutions,
      totalKnowledgeExchanges: s.totalKnowledgeExchanges,
      totalSharedWorkspaceUsage: s.totalSharedWorkspaceUsage,
      averageEfficiency: s.efficiencyCount > 0 ? s.efficiencySum / s.efficiencyCount : 0,
    }))

    const reset = Ref.set(store, {
      totalCollaborationRounds: 0,
      totalPeerReviews: 0,
      totalConsensusDurationMs: 0,
      totalConflictResolutions: 0,
      totalKnowledgeExchanges: 0,
      totalSharedWorkspaceUsage: 0,
      efficiencySum: 0,
      efficiencyCount: 0,
    })

    return Service.of({ recordCollaborationMetrics, getAggregated, reset })
  }),
)

export { layer }
