export * as SpecialistCoordinator from "./specialist-coordinator"

import { Context, Effect, Layer } from "effect"
import { SpecialistRegistry } from "../specialists/registry"
import { SpecialistConversation } from "../session/specialist-conversation"
import { SpecialistScoreboard } from "./specialist-scoreboard"
import type { CollaborationPolicyType } from "../integration/collaboration-result"
import type { ExecutionPackage, VirtualTeam } from "../integration/execution-package"

export interface Interface {
  readonly coordinate: (pkg: ExecutionPackage, team: VirtualTeam, policy: CollaborationPolicyType) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistCoordinator") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* SpecialistRegistry.Service
    const conversation = yield* SpecialistConversation.Service
    const scoreboard = yield* SpecialistScoreboard.Service

    const coordinate: Interface["coordinate"] = Effect.fn("SpecialistCoordinator.coordinate")(function* (pkg, team, policy) {
      const participants = team.activeParticipants
      if (participants.length === 0) return

      const profiles = yield* Effect.all(
        participants.map((id) => registry.getByID(id).pipe(Effect.map((p) => p ?? undefined))),
      )
      const valid = profiles.filter((p): p is NonNullable<typeof p> => p !== undefined)

      const threadID = yield* conversation.startThread(participants)
      for (const p of valid) {
        yield* scoreboard.recordParticipation(p.id, p.name)
        yield* conversation.sendMessage(
          threadID, p.id, "all", "recommendation",
          `Advisory coordination for ${pkg.taskClassification.type}`,
          p.confidenceWeight ?? 0.7,
        )
      }
    })

    return Service.of({ coordinate })
  }),
)

export { layer }
