export * as DiscussionModerator from "./discussion-moderator"

import { Context, Effect, Layer } from "effect"
import { SpecialistConversation } from "../session/specialist-conversation"
import { TeamDiscussionEngine } from "../team/team-discussion"
import type { CollaborationMessage } from "../integration/collaboration-result"
import type { VirtualTeam, WorkspaceSummaries } from "../integration/execution-package"

export interface Interface {
  readonly moderate: (
    team: VirtualTeam,
    workspaces: WorkspaceSummaries,
    topic: string,
    rounds: number,
  ) => Effect.Effect<readonly CollaborationMessage[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DiscussionModerator") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const conversation = yield* SpecialistConversation.Service
    const discussionEngine = yield* TeamDiscussionEngine.Service

    const moderate: Interface["moderate"] = Effect.fn("DiscussionModerator.moderate")(function* (team, workspaces, topic, rounds) {
      const participants = team.activeParticipants
      if (participants.length === 0) return []

      const threadID = yield* conversation.startThread(participants)
      const messages: CollaborationMessage[] = []

      for (let round = 0; round < Math.max(1, rounds); round++) {
        for (const participant of participants) {
          const content = `Round ${round + 1} — ${topic}: specialist ${participant} contributes advisory perspective`
          yield* conversation.sendMessage(threadID, participant, "all", "recommendation", content, 0.7)
          messages.push({
            from: participant,
            to: "all",
            type: "recommendation",
            content,
            timestamp: Date.now(),
            confidence: 0.7,
          })
        }
      }

      yield* discussionEngine.build(team, workspaces)
      return messages
    })

    return Service.of({ moderate })
  }),
)

export { layer }
