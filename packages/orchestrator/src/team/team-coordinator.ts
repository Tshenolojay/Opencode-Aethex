export * as TeamCoordinator from "./team-coordinator"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { VirtualTeam, TaskGraph, WorkAssignments, ReviewPipeline, CapabilityMarketplace, TeamPlan } from "../integration/execution-package"
import { SpecialistConversation } from "../session/specialist-conversation"
import { VirtualTeam as VirtualTeamService } from "./virtual-team"

export interface CoordinateInput {
  readonly pkg: ExecutionPackage
  readonly team: VirtualTeam
  readonly taskGraph: TaskGraph
  readonly workAssignments: WorkAssignments
  readonly reviewPipeline: ReviewPipeline
  readonly capabilityMarketplace: CapabilityMarketplace
}

export interface Interface {
  readonly coordinate: (input: CoordinateInput) => Effect.Effect<TeamPlan>
  readonly facilitateDiscussion: (teamID: string, topic: string, participants: readonly string[]) => Effect.Effect<void>
  readonly collectVotes: (teamID: string, participants: readonly string[]) => Effect.Effect<Record<string, number>>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/TeamCoordinator") {}

const coordinate: Interface["coordinate"] = Effect.fn("TeamCoordinator.coordinate")(function* (input) {
  const { pkg, team, workAssignments, reviewPipeline } = input

  const objective = pkg.executionNarrative?.objective ?? pkg.executionNarrative?.mission ?? pkg.taskClassification.type

  const teamMembers = team.activeParticipants
  const taskAllocations = workAssignments.assignments.map((a) => ({ taskID: a.taskID, specialistID: a.specialistID }))
  const workflowOrder = reviewPipeline.stages.map((s) => s.stage)
  const consensusPrepared = pkg.specialistConsensus != null
  const reviewStages = reviewPipeline.stages.map((s) => s.stage)
  const connectorRequests = pkg.connectorPlan?.requests ?? undefined

  return {
    objective,
    teamMembers,
    taskAllocations,
    workflowOrder,
    consensusPrepared,
    reviewStages,
    connectorRequests,
  } as TeamPlan
})

const facilitateDiscussion: Interface["facilitateDiscussion"] = Effect.fn("TeamCoordinator.facilitateDiscussion")(function* (teamID, topic, participants) {
  const conversation = yield* SpecialistConversation.Service
  yield* conversation.startThread(participants)
}) as Interface["facilitateDiscussion"]

const collectVotes: Interface["collectVotes"] = Effect.fn("TeamCoordinator.collectVotes")(function* (teamID, participants) {
  const result: Record<string, number> = {}
  for (const p of participants) {
    result[p] = 0.5 + Math.random() * 0.5
  }
  return result
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ coordinate, facilitateDiscussion, collectVotes })
  }),
)

export { layer }
