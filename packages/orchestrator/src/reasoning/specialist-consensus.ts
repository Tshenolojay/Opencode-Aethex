export * as SpecialistConsensus from "./specialist-consensus"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { SpecialistConsensus as Consensus, ConsensusLevel } from "../integration/execution-package"

export interface WeightedVote {
  readonly specialistID: string
  readonly vote: "agree" | "disagree" | "abstain"
  readonly weight: number
  readonly confidence: number
  readonly reasoning: string
}

export interface ConflictRecord {
  readonly id: string
  readonly between: readonly string[]
  readonly issue: string
  readonly evidence: readonly string[]
  readonly resolved: boolean
  readonly resolution: string | undefined
  readonly resolvedBy: string | undefined
}

export interface ConsensusReport {
  readonly overallConsensus: ConsensusLevel
  readonly overallConfidence: number
  readonly agreements: readonly string[]
  readonly disagreements: readonly string[]
  readonly weightedVotes: readonly WeightedVote[]
  readonly conflicts: readonly ConflictRecord[]
  readonly minorityOpinions: readonly string[]
  readonly missingEvidence: readonly string[]
  readonly recommendations: readonly string[]
  readonly finalRecommendation: string | undefined
}

export interface Interface {
  readonly analyze: (pkg: ExecutionPackage) => Effect.Effect<Consensus>
  readonly analyzeWithVotes: (pkg: ExecutionPackage, votes: readonly WeightedVote[]) => Effect.Effect<ConsensusReport>
  readonly resolveConflict: (conflict: ConflictRecord, resolution: string, resolvedBy: string) => ConflictRecord
  readonly computeWeightedConsensus: (votes: readonly WeightedVote[]) => {
    readonly agreementRatio: number
    readonly weightedAgreement: number
    readonly level: ConsensusLevel
  }
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistConsensus") {}

const analyze: Interface["analyze"] = Effect.fn("SpecialistConsensus.analyze")(function* (pkg) {
  const agreements: string[] = []
  const disagreements: string[] = []
  const missingEvidence: string[] = []
  const confidenceTrends: string[] = []
  const confidenceGaps: string[] = []
  const verificationGaps: string[] = []
  const unresolvedQuestions: string[] = []
  const recommendations: string[] = []

  const intel = pkg.executionIntelligence
  const repo = pkg.repositoryIntelligence
  const arch = pkg.architectureIntelligence
  const dep = pkg.dependencyIntelligence
  const ver = pkg.verificationIntelligence
  const doc = pkg.documentationIntelligence

  if (repo?.enrichedSummary && arch?.summary) agreements.push("Repository and architecture analyses both produced structured findings")
  if (intel?.executionConstraints?.some((c) => c.type === "hard")) {
    agreements.push("Verification requirement is consistently flagged across planning and intelligence")
  }
  if ((pkg.dispatchPlan?.requiredAgents.length ?? 0) > 0) {
    agreements.push(`Specialist plan and dispatch plan agree on ${pkg.dispatchPlan?.requiredAgents.length} agent(s)`)
  }

  if (arch && (arch.risks.length > 0) && dep && (dep.risks.length > 0)) {
    disagreements.push("Architecture and dependency analyses both surface risk — coordinate before structural changes")
  }
  if (intel?.executionRisks?.some((r) => r.category === "verification") && !pkg.taskClassification.requiresVerification) {
    disagreements.push("Intelligence recommends verification but task classification did not request it")
  }

  if (!repo?.enrichedSummary && !pkg.knowledgeBundle.repositorySummary) missingEvidence.push("No repository summary available")
  if (!arch?.summary && !pkg.knowledgeBundle.architectureSummary) missingEvidence.push("No architecture summary available")
  if ((pkg.knowledgeBundle.relevantFiles.length === 0)) missingEvidence.push("No relevant files identified")

  if (pkg.confidence === "high") confidenceTrends.push("Task classified with high confidence — proceed directly")
  else if (pkg.confidence === "low") confidenceTrends.push("Low confidence — prefer incremental, verifiable steps")
  if ((intel?.executionRisks?.length ?? 0) > 2) confidenceTrends.push("Multiple risks detected — confidence in straightforward execution is reduced")

  if (pkg.confidenceScore && pkg.confidenceScore.score < 0.5) confidenceGaps.push("Confidence score below 0.5")
  if ((pkg.capabilityPlan?.required.length ?? 0) === 0 && (pkg.dispatchPlan?.requiredAgents.length ?? 0) > 0) {
    confidenceGaps.push("Dispatch plan requires agents but no capability plan was produced")
  }

  if (pkg.taskClassification.requiresVerification && (ver?.mergedResults.length ?? 0) === 0) {
    verificationGaps.push("Verification requested but no verification results present")
  }
  if (intel?.executionRecommendations?.some((r) => r.category === "verification")) {
    verificationGaps.push("Verification step recommended before completion")
  }

  if (missingEvidence.length > 0) unresolvedQuestions.push(...missingEvidence.map((m) => `What is ${m.replace("No ", "").replace(" available", "")}?`))
  if (disagreements.length > 0) unresolvedQuestions.push("Which analysis takes precedence for this change?")

  if (intel?.executionRecommendations) recommendations.push(...intel.executionRecommendations.map((r) => r.recommendation))
  if (verificationGaps.length > 0) recommendations.push("Run verification before declaring completion")

  const overallConfidence = clampConfidence(
    (pkg.confidenceScore?.score ?? (pkg.confidence === "high" ? 0.9 : pkg.confidence === "medium" ? 0.6 : 0.4)) -
      disagreements.length * 0.05 -
      verificationGaps.length * 0.05,
  )

  let overallConsensus: ConsensusLevel = "moderate"
  if (disagreements.length > 1) overallConsensus = "conflicted"
  else if (agreements.length >= 2 && missingEvidence.length === 0) overallConsensus = "strong"
  else if (missingEvidence.length > 1) overallConsensus = "weak"

  return {
    overallConsensus,
    overallConfidence,
    agreements,
    disagreements,
    missingEvidence,
    confidenceTrends,
    confidenceGaps,
    verificationGaps,
    unresolvedQuestions,
    recommendations,
  }
})

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}

function computeWeightedConsensus(votes: readonly WeightedVote[]): {
  readonly agreementRatio: number
  readonly weightedAgreement: number
  readonly level: ConsensusLevel
} {
  if (votes.length === 0) return { agreementRatio: 0, weightedAgreement: 0, level: "weak" }

  let totalWeight = 0
  let agreeWeight = 0

  for (const v of votes) {
    const w = v.weight * v.confidence
    totalWeight += w
    if (v.vote === "agree") agreeWeight += w
  }

  const weightedAgreement = totalWeight > 0 ? agreeWeight / totalWeight : 0
  const agreementRatio = votes.filter((v) => v.vote === "agree").length / votes.length

  let level: ConsensusLevel = "moderate"
  if (weightedAgreement >= 0.8 && agreementRatio >= 0.7) level = "strong"
  else if (weightedAgreement < 0.4 || agreementRatio < 0.4) level = "conflicted"
  else if (agreementRatio < 0.6) level = "weak"

  return { agreementRatio, weightedAgreement, level }
}

function resolveConflict(conflict: ConflictRecord, resolution: string, resolvedBy: string): ConflictRecord {
  return { ...conflict, resolved: true, resolution, resolvedBy }
}

const analyzeWithVotes: Interface["analyzeWithVotes"] = Effect.fn("SpecialistConsensus.analyzeWithVotes")(function* (pkg, votes) {
  const base = yield* analyze(pkg)
  return {
    overallConsensus: base.overallConsensus,
    overallConfidence: base.overallConfidence,
    agreements: base.agreements,
    disagreements: base.disagreements,
    weightedVotes: votes,
    conflicts: [],
    minorityOpinions: [],
    missingEvidence: base.missingEvidence,
    recommendations: base.recommendations,
    finalRecommendation: base.recommendations.length > 0 ? base.recommendations[0] : undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze, analyzeWithVotes, resolveConflict, computeWeightedConsensus })
  }),
)

export { layer }
