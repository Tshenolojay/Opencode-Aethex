export * as ConflictResolution from "./conflict-resolution"

import { Context, Effect, Layer } from "effect"
import { SpecialistConsensus } from "../reasoning/specialist-consensus"
import type { ConflictRecord } from "../reasoning/specialist-consensus"
import type { ExecutionPackage } from "../integration/execution-package"
import type { ConflictReport, DetectedConflict, ResolvedConflict } from "../integration/collaboration-result"

export interface Interface {
  readonly analyze: (pkg: ExecutionPackage, detected: readonly DetectedConflict[]) => Effect.Effect<ConflictReport>
  readonly resolve: (conflict: DetectedConflict, resolution: string, resolvedBy: string) => ConflictRecord
  readonly buildRecord: (conflict: DetectedConflict) => ConflictRecord
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConflictResolution") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const consensus = yield* SpecialistConsensus.Service

    const buildRecord: Interface["buildRecord"] = (conflict) =>
      ({
        id: conflict.id,
        between: conflict.between,
        issue: conflict.issue,
        evidence: conflict.evidence,
        resolved: false,
        resolution: undefined,
        resolvedBy: undefined,
      }) as ConflictRecord

    const analyze: Interface["analyze"] = Effect.fn("ConflictResolution.analyze")(function* (pkg, detected) {
      const unresolved = detected.map((d) => `${d.id}: ${d.issue}`)
      const recommendations = detected.map((d) =>
        d.between.length > 1
          ? `Reconcile conflicting conclusions between ${d.between.join(", ")}`
          : `Investigate contradiction: ${d.issue}`,
      )
      const report: ConflictReport = {
        detected,
        resolved: [],
        unresolved,
        recommendations,
      }
      return report
    })

    const resolve: Interface["resolve"] = (conflict, resolution, resolvedBy) =>
      consensus.resolveConflict(buildRecord(conflict), resolution, resolvedBy)

    return Service.of({ analyze, resolve, buildRecord })
  }),
)

export { layer }
