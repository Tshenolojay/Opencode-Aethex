export * as ConsensusEngine from "./consensus-engine"

import { Context, Effect, Layer } from "effect"
import { SpecialistConsensus } from "../reasoning/specialist-consensus"
import type { ConsensusReport, WeightedVote } from "../reasoning/specialist-consensus"
import type { ExecutionPackage } from "../integration/execution-package"
import type { CollaborationPolicyType } from "../integration/collaboration-result"
import { CollaborationPolicy } from "./collaboration-policy"

export interface DetectedConflictSummary {
  readonly id: string
  readonly between: readonly string[]
  readonly issue: string
  readonly evidence: readonly string[]
}

export interface Interface {
  readonly runConsensus: (pkg: ExecutionPackage, votes: readonly WeightedVote[], policy: CollaborationPolicyType) => Effect.Effect<ConsensusReport>
  readonly detectConflicts: (pkg: ExecutionPackage, votes: readonly WeightedVote[]) => Effect.Effect<readonly DetectedConflictSummary[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConsensusEngine") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const consensus = yield* SpecialistConsensus.Service
    const policyService = yield* CollaborationPolicy.Service

    const runConsensus: Interface["runConsensus"] = Effect.fn("ConsensusEngine.runConsensus")(function* (pkg, votes, policy) {
      const policyProfile = policyService.getPolicy(policy)
      const baseline = yield* consensus.analyze(pkg)
      const weighted = consensus.computeWeightedConsensus(votes)

      const agreeVotes = votes.filter((v) => v.vote === "agree")
      const disagreeVotes = votes.filter((v) => v.vote === "disagree")

      const agreements = [
        ...new Set([...baseline.agreements, ...agreeVotes.flatMap((v) => v.reasoning ? [v.reasoning] : [])]),
      ]

      const disagreements = [
        ...new Set([
          ...baseline.disagreements,
          ...disagreeVotes.map((v) => `${v.specialistID} disagrees: ${v.reasoning}`),
        ]),
      ]

      const majorityVote = weighted.weightedAgreement >= 0.5 ? "agree" : "disagree"
      const minorityOpinions = votes
        .filter((v) => v.vote !== "abstain" && v.vote !== majorityVote)
        .map((v) => `${v.specialistID} (${v.vote}): ${v.reasoning}`)

      const recommendations = [
        ...new Set([
          ...baseline.recommendations,
          weighted.level === "strong" ? "Proceed with high-confidence unified advisory" : "Gather additional evidence before finalizing",
        ]),
      ]

      const finalRecommendation = weighted.level === "conflicted"
        ? "Resolve conflicting specialist conclusions before execution"
        : weighted.level === "weak"
          ? "Proceed with caution; consensus is weak"
          : "Proceed with unified specialist recommendation"

      const report: ConsensusReport = {
        overallConsensus: weighted.level,
        overallConfidence: Math.max(0, Math.min(1, weighted.weightedAgreement * (1 - disagreements.length * 0.05))),
        agreements,
        disagreements,
        missingEvidence: baseline.missingEvidence,
        recommendations,
        weightedVotes: votes,
        conflicts: [],
        minorityOpinions,
        finalRecommendation,
      }
      return report
    })

    const detectConflicts: Interface["detectConflicts"] = Effect.fn("ConsensusEngine.detectConflicts")(function* (pkg, votes) {
      const conflicts: DetectedConflictSummary[] = []
      const disagreeVotes = votes.filter((v) => v.vote === "disagree")
      for (const v of disagreeVotes) {
        conflicts.push({
          id: `conflict-${v.specialistID}`,
          between: [v.specialistID],
          issue: v.reasoning,
          evidence: [v.reasoning],
        })
      }
      const baseline = yield* consensus.analyze(pkg)
      baseline.disagreements.forEach((d, i) => {
        conflicts.push({ id: `conflict-intel-${i}`, between: [], issue: d, evidence: [d] })
      })
      return conflicts
    })

    return Service.of({ runConsensus, detectConflicts })
  }),
)

export { layer }
