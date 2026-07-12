import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { VirtualTeam } from "../team/virtual-team"
import { TaskDecomposer } from "../team/task-decomposer"
import { WorkAllocationEngine } from "../team/work-allocation"
import { TeamWorkspace } from "../team/workspace"
import { TeamDiscussionEngine } from "../team/team-discussion"
import { ReviewPipeline as ReviewPipelineService } from "../team/review-pipeline"
import { CapabilityMarketplace } from "../team/capability-marketplace"
import { TeamCoordinator } from "../team/team-coordinator"
import { RuntimeMetrics } from "../runtime/runtime-metrics"

export const runTeamStage = Effect.fn("Pipeline.team")(function* (state: PipelineState) {
  const teamService = yield* VirtualTeam.Service
  const decomposer = yield* TaskDecomposer.Service
  const allocator = yield* WorkAllocationEngine.Service
  const workspaceService = yield* TeamWorkspace.Service
  const discussionService = yield* TeamDiscussionEngine.Service
  const reviewService = yield* ReviewPipelineService.Service
  const marketplaceService = yield* CapabilityMarketplace.Service
  const coordinator = yield* TeamCoordinator.Service
  const runtimeMetrics = yield* RuntimeMetrics.Service

  const tTeamBuild = Date.now()
  const virtualTeam = yield* teamService.build(state.executionPackage)
  yield* runtimeMetrics.recordTeamDecompositionTime(Date.now() - tTeamBuild)

  const tDecompose = Date.now()
  const taskGraph = yield* decomposer.decompose(state.executionPackage)
  yield* runtimeMetrics.recordTeamDecompositionTime(Date.now() - tDecompose)

  const tAllocate = Date.now()
  const workAssignments = yield* allocator.allocate(taskGraph, virtualTeam, state.executionPackage)
  yield* runtimeMetrics.recordTeamAllocationTime(Date.now() - tAllocate)

  const tWorkspace = Date.now()
  const workspaceSummaries = yield* workspaceService.buildWorkspaces(virtualTeam, state.executionPackage)
  yield* runtimeMetrics.recordTeamWorkspaceTime(Date.now() - tWorkspace)

  const tDiscussion = Date.now()
  const teamDiscussion = yield* discussionService.build(virtualTeam, workspaceSummaries)
  yield* runtimeMetrics.recordTeamDiscussionTime(Date.now() - tDiscussion)

  const tReview = Date.now()
  const reviewPipeline = yield* reviewService.run(state.executionPackage)
  yield* runtimeMetrics.recordTeamReviewTime(Date.now() - tReview)

  const tMarketplace = Date.now()
  const capabilityMarketplace = yield* marketplaceService.build(virtualTeam)

  const tCoordinate = Date.now()
  const teamPlan = yield* coordinator.coordinate({
    pkg: state.executionPackage,
    team: virtualTeam,
    taskGraph,
    workAssignments,
    reviewPipeline,
    capabilityMarketplace,
  })
  yield* runtimeMetrics.recordTeamCollaborationTime(Date.now() - tCoordinate)

  const tStage = Date.now()

  return {
    ...state,
    executionPackage: {
      ...state.executionPackage,
      virtualTeam,
      taskGraph,
      workAssignments,
      workspaceSummaries,
      teamDiscussion,
      reviewPipeline,
      capabilityMarketplace,
      teamPlan,
    },
    diagnostics: [
      ...state.diagnostics,
      { phase: "virtual-team-framework", durationMs: Date.now() - tStage, result: `team=${virtualTeam.activeParticipants.length} tasks=${taskGraph.units.length} reviews=${reviewPipeline.stages.length}`, error: undefined },
    ],
  } as PipelineState
})
