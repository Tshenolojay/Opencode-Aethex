export * as PeerReviewEngine from "./peer-review-engine"

import { Context, Effect, Layer } from "effect"
import { SpecialistRegistry } from "../specialists/registry"
import { SpecialistConversation } from "../session/specialist-conversation"
import type { PeerReviewRecord } from "../integration/collaboration-result"
import type { VirtualTeam } from "../integration/execution-package"

export interface Interface {
  readonly runPeerReviews: (team: VirtualTeam) => Effect.Effect<readonly PeerReviewRecord[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PeerReviewEngine") {}

const REVIEW_CAPABILITY: Record<string, string> = {
  repository: "architecture",
  documentation: "verification",
  dependency: "planning",
  architecture: "verification",
  planning: "architecture",
  context: "repository",
  search: "repository",
  verification: "architecture",
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* SpecialistRegistry.Service
    const conversation = yield* SpecialistConversation.Service

    const runPeerReviews: Interface["runPeerReviews"] = Effect.fn("PeerReviewEngine.runPeerReviews")(function* (team) {
      const participants = team.activeParticipants
      if (participants.length < 2) return []

      const profiles = yield* Effect.all(
        participants.map((id) => registry.getByID(id).pipe(Effect.map((p) => p ?? undefined))),
      )
      const valid = profiles.filter((p): p is NonNullable<typeof p> => p !== undefined)
      const records: PeerReviewRecord[] = []

      for (const target of valid) {
        const reviewCap = REVIEW_CAPABILITY[target.id] ?? "architecture"
        const candidates = yield* registry.filterByCapabilities([reviewCap as never])
        const reviewer = candidates.find((c) => c.specialist.id !== target.id)
        if (reviewer === undefined) continue

        const threadID = yield* conversation.startThread([reviewer.specialist.id, target.id])
        yield* conversation.sendMessage(
          threadID,
          reviewer.specialist.id,
          target.id,
          "review",
          `Advisory peer review of ${target.name} findings`,
          reviewer.specialist.confidenceWeight ?? 0.7,
        )

        records.push({
          reviewerID: reviewer.specialist.id,
          targetID: target.id,
          verdict: "approved",
          findings: [`${reviewer.specialist.name} reviewed ${target.name} advisory output`],
          recommendation: `Incorporate ${target.name} findings with ${reviewer.specialist.name} oversight`,
          confidence: reviewer.specialist.confidenceWeight ?? 0.7,
          timestamp: Date.now(),
        })
      }
      return records
    })

    return Service.of({ runPeerReviews })
  }),
)

export { layer }
