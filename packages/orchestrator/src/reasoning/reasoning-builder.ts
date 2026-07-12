export * as ReasoningBuilder from "./reasoning-builder"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { ExecutionNarrative, SpecialistConsensus, ReasoningDecisionSummary } from "../integration/execution-package"
import { SpecialistConsensus as ConsensusService } from "./specialist-consensus"
import { ExecutionNarrative as NarrativeService } from "./execution-narrative"
import { DecisionEngine } from "./decision-engine"
import { ReasoningMemory } from "./reasoning-memory"
import { RuntimeMetrics } from "../runtime/runtime-metrics"

export interface ReasoningReport {
  readonly narrative: ExecutionNarrative
  readonly consensus: SpecialistConsensus
  readonly decisions: ReasoningDecisionSummary
  readonly reasoningSummary: string
  readonly reasoningConfidence: number
  readonly consensusTimeMs: number
  readonly narrativeTimeMs: number
  readonly decisionTimeMs: number
}

export interface Interface {
  readonly build: (pkg: ExecutionPackage) => Effect.Effect<ReasoningReport>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ReasoningBuilder") {}

const build: Interface["build"] = Effect.fn("ReasoningBuilder.build")(function* (pkg) {
  const consensusService = yield* ConsensusService.Service
  const narrativeService = yield* NarrativeService.Service
  const decisionService = yield* DecisionEngine.Service
  const memory = yield* ReasoningMemory.Service
  const metrics = yield* RuntimeMetrics.Service

  const priorPresent = yield* memory.hasPriorReasoning
  if (priorPresent) yield* memory.recordReuse()

  const tStart = Date.now()

  const tCons = Date.now()
  const consensus = yield* consensusService.analyze(pkg)
  const consensusTime = Date.now() - tCons
  yield* metrics.recordConsensusTime(consensusTime)

  const tNarr = Date.now()
  const narrative = yield* narrativeService.build(pkg, consensus)
  const narrTime = Date.now() - tNarr
  yield* metrics.recordNarrativeTime(narrTime)

  const tDec = Date.now()
  const decisions = yield* decisionService.decide(pkg)
  const decTime = Date.now() - tDec
  yield* metrics.recordDecisionTime(decTime)

  yield* metrics.recordReasoningBuildTime(Date.now() - tStart)

  // Persist reasoning history for session-scoped reuse
  yield* memory.addReasoning(narrative.fullText)
  yield* memory.addConclusion(narrative.objective ?? narrative.mission ?? "")
  yield* memory.addInvestigation(narrative.taskSummary ?? "")
  for (const r of narrative.risks ?? []) yield* memory.addRisk(r)
  if (narrative.architectureFindings) yield* memory.addArchitectureObservation(narrative.architectureFindings)
  if (narrative.dependencyFindings) yield* memory.addDependencyObservation(narrative.dependencyFindings)
  if (narrative.verificationFindings) yield* memory.addVerificationResult(narrative.verificationFindings)
  for (const rec of consensus.recommendations) yield* memory.addRecommendation(rec)

  const reasoningSummary = `Consensus: ${consensus.overallConsensus} (${Math.round(consensus.overallConfidence * 100)}%). ${consensus.recommendations[0] ?? narrative.recommendedWorkflow ?? ""}`
  const reasoningConfidence = consensus.overallConfidence

  return { narrative, consensus, decisions, reasoningSummary, reasoningConfidence, consensusTimeMs: consensusTime, narrativeTimeMs: narrTime, decisionTimeMs: decTime } as ReasoningReport
}) as Interface["build"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
