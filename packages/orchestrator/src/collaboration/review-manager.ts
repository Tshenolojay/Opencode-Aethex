export * as ReviewManager from "./review-manager"

import { Context, Effect, Layer } from "effect"
import { ReviewPipeline as ReviewPipelineService } from "../team/review-pipeline"
import type { PeerReviewRecord } from "../integration/collaboration-result"
import type { ExecutionPackage, ReviewPipeline } from "../integration/execution-package"

export interface Interface {
  readonly manage: (pkg: ExecutionPackage, peerReviews: readonly PeerReviewRecord[]) => Effect.Effect<ReviewPipeline>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ReviewManager") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const reviewPipeline = yield* ReviewPipelineService.Service

    const manage: Interface["manage"] = Effect.fn("ReviewManager.manage")(function* (pkg, peerReviews) {
      const base = yield* reviewPipeline.run(pkg)
      const peerStage = {
        stage: "peer-review",
        status: "completed" as const,
        findings: peerReviews.flatMap((r) => r.findings),
        recommendation: `Peer reviews: ${peerReviews.length} completed`,
      }
      return {
        ...base,
        stages: [...base.stages, peerStage],
      }
    })

    return Service.of({ manage })
  }),
)

export { layer }
