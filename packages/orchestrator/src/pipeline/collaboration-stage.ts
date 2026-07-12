import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { CollaborationEngine } from "../collaboration/collaboration-engine"
import { CollaborationSession as CollaborationSessionService } from "../collaboration/collaboration-session"
import { CollaborationMetricsAggregator } from "../collaboration/collaboration-metrics"

export const runCollaborationStage = Effect.fn("Pipeline.collaboration")(function* (state: PipelineState) {
  const startTime = Date.now()

  const pkg = state.executionPackage
  const team = state.virtualTeam
  const workspaces = pkg.workspaceSummaries

  if (team === undefined || workspaces === undefined) {
    return {
      ...state,
      diagnostics: [
        ...state.diagnostics,
        { phase: "collaboration", durationMs: Date.now() - startTime, result: "skipped", error: undefined },
      ],
    }
  }

  const engine = yield* CollaborationEngine.Service
  const session = yield* CollaborationSessionService.Service
  const metrics = yield* CollaborationMetricsAggregator.Service

  const members = team.members.map((m) => ({
    specialistID: m.specialistID,
    findings: m.role ? [m.role] : [],
    evidence: [],
    confidence: m.confidence,
    risks: [],
    openQuestions: [],
    recommendations: [],
    producedKnowledge: m.sharedKnowledge ?? [],
    consumedKnowledge: [],
    completedTasks: [],
    pendingTasks: [],
  }))

  const result = yield* engine.run(
    pkg,
    team,
    workspaces,
    members.map((m) => ({
      specialistID: m.specialistID,
      vote: "agree" as const,
      weight: m.confidence,
      confidence: m.confidence,
      reasoning: `Advisory contribution from ${m.specialistID}`,
    })),
  )

  yield* metrics.recordCollaborationMetrics(result.metrics)

  return {
    ...state,
    executionPackage: {
      ...pkg,
      collaboration: result,
    },
    diagnostics: [
      ...state.diagnostics,
      { phase: "collaboration", durationMs: Date.now() - startTime, result: "completed", error: undefined },
    ],
  }
})
