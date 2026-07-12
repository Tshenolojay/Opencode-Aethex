import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { TaskClassifier } from "../classifier/classifier"
import { ConfidenceEngine } from "../confidence/confidence"
import { AgentDispatcher } from "../dispatcher/dispatcher"

export const runFoundationStage = Effect.fn("Pipeline.foundation")(function* (state: PipelineState) {
  const classifier = yield* TaskClassifier.Service
  const confidence = yield* ConfidenceEngine.Service

  const tClassify = Date.now()
  const classification = yield* classifier.classify({
    text: state.input.promptText,
    filesAttached: state.input.filesAttached,
    conversationLength: state.input.conversationLength,
  })
  const classMs = Date.now() - tClassify

  const richSignals = [
    { signal: "prompt-text" as const, text: state.input.promptText, weight: 1.0 },
    ...(state.input.sessionMetadata
      ? [{ signal: "session-metadata" as const, text: JSON.stringify(state.input.sessionMetadata), weight: 0.3 }]
      : []),
    ...(state.input.assistantResponses
      ? state.input.assistantResponses.map((r) => ({ signal: "previous-responses" as const, text: r, weight: 0.4 }))
      : []),
    ...(state.input.toolResults
      ? state.input.toolResults.map((r) => ({ signal: "tool-results" as const, text: r, weight: 0.5 }))
      : []),
    ...(state.input.projectInfo
      ? [{ signal: "project-info" as const, text: state.input.projectInfo, weight: 0.6 }]
      : []),
  ]

  const classifications = yield* classifier.classifyRich({
    signals: richSignals,
    sessionMetadata: state.input.sessionMetadata,
    assistantResponses: state.input.assistantResponses,
    toolResults: state.input.toolResults,
    projectInfo: state.input.projectInfo,
  })

  const tConf = Date.now()
  const confidenceLevel = yield* confidence.estimate({
    classification,
    repositorySize: state.input.repositorySize,
    conversationLength: state.input.conversationLength,
    filesAttached: state.input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: state.input.contextAvailable,
    previousToolResults: state.input.previousToolResults,
  })
  const confMs = Date.now() - tConf

  const confidenceScore = yield* confidence.estimateWithScore({
    classification,
    repositorySize: state.input.repositorySize,
    conversationLength: state.input.conversationLength,
    filesAttached: state.input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: state.input.contextAvailable,
    previousToolResults: state.input.previousToolResults,
    classifications,
    sessionMetadata: state.input.sessionMetadata,
    toolHistory: state.input.toolResults,
  })

  return {
    ...state,
    classification,
    classifications,
    confidenceLevel,
    confidenceScore,
    diagnostics: [
      ...state.diagnostics,
      { phase: "classification", durationMs: classMs, result: `type=${classification.type}`, error: undefined },
      { phase: "confidence", durationMs: confMs, result: `level=${confidenceLevel}`, error: undefined },
    ],
  } as PipelineState
})
