import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { KnowledgeCollector } from "../execution/knowledge-collector"
import { KnowledgeMerger } from "../execution/knowledge-merger"
import { KnowledgeValidator } from "../intelligence/knowledge-validator"
import { RankingEngine } from "../intelligence/ranking-engine"
import { RepositoryIntelligence } from "../intelligence/repository-intelligence"
import { ContextIntelligence } from "../intelligence/context-intelligence"
import { DependencyIntelligence } from "../intelligence/dependency-intelligence"
import { DocumentationIntelligence } from "../intelligence/documentation-intelligence"
import { ArchitectureIntelligence } from "../intelligence/architecture-intelligence"
import { VerificationIntelligence } from "../intelligence/verification-intelligence"
import { KnowledgeBundle } from "../knowledge/knowledge"

export const runIntelligenceStage = Effect.fn("Pipeline.intelligence")(function* (state: PipelineState) {
  const collector = yield* KnowledgeCollector.Service
  const merger = yield* KnowledgeMerger.Service
  const validator = yield* KnowledgeValidator.Service
  const rankingEngine = yield* RankingEngine.Service
  const repoIntelligence = yield* RepositoryIntelligence.Service
  const contextIntelligence = yield* ContextIntelligence.Service
  const depIntelligence = yield* DependencyIntelligence.Service
  const docIntelligence = yield* DocumentationIntelligence.Service
  const archIntelligence = yield* ArchitectureIntelligence.Service
  const verIntelligence = yield* VerificationIntelligence.Service

  const results = state.runtimeOutput?.results ?? []

  const collected = yield* collector.collect(results)

  const baseBundle = yield* merger.merge({
    base: KnowledgeBundle.empty(state.classification.type),
    collected,
    results,
  })
  const knowledgeBundle: KnowledgeBundle = {
    ...baseBundle,
    planMetadata: {
      planStartTime: Date.now(),
      planEndTime: undefined,
      knowledgeVersion: 1,
      source: "project-default" as const,
    },
    knowledgeRequirements: results.length > 0
      ? results[0]?.collectedKnowledge.map((k) => ({
          domain: k.type,
          description: `Knowledge entry: ${k.type}`,
          required: true,
        }))
      : undefined,
    searchTargets: state.classification.requiresSearch
      ? [{ pattern: state.classification.type, description: "Search for relevant code", priority: 1, type: "code" as const }]
      : undefined,
    verificationTargets: state.classification.requiresVerification
      ? [{ target: state.classification.type, criteria: "Verify task requirements", priority: 1 }]
      : undefined,
  }

  const tValid = Date.now()
  const validatedResults = yield* Effect.forEach(
    results,
    (r) => validator.validate(r),
  )
  const validMs = Date.now() - tValid
  const totalInvalid = validatedResults.reduce((acc, v) => acc + v.invalidCount, 0)

  const tRank = Date.now()
  const allEntries = results.flatMap((r) => r.collectedKnowledge)
  const ranked = yield* rankingEngine.rank(allEntries, state.input.promptText)
  const rankMs = Date.now() - tRank

  const tRepo = Date.now()
  const repoAnalysis = yield* repoIntelligence.analyze(knowledgeBundle)
  const repoMs = Date.now() - tRepo

  const tDep = Date.now()
  const depAnalysis = yield* depIntelligence.analyze(knowledgeBundle)
  const depMs = Date.now() - tDep

  const tDoc = Date.now()
  const docAnalysis = yield* docIntelligence.analyze(knowledgeBundle)
  const docMs = Date.now() - tDoc

  const tArch = Date.now()
  const archAnalysis = yield* archIntelligence.analyze(knowledgeBundle)
  const archMs = Date.now() - tArch

  const tVer = Date.now()
  const verAnalysis = yield* verIntelligence.analyze(knowledgeBundle)
  const verMs = Date.now() - tVer

  const tCtx = Date.now()
  const ctxReport = yield* contextIntelligence.prepare(knowledgeBundle)
  const ctxMs = Date.now() - tCtx

  return {
    ...state,
    knowledgeBundle,
    repoAnalysis,
    depAnalysis,
    docAnalysis,
    archAnalysis,
    verAnalysis,
    ctxReport,
    diagnostics: [
      ...state.diagnostics,
      { phase: "knowledge-validation", durationMs: validMs, result: `validated=${validatedResults.reduce((a, v) => a + v.entries.length, 0)} invalid=${totalInvalid}`, error: undefined },
      { phase: "knowledge-ranking", durationMs: rankMs, result: `ranked=${ranked.length}`, error: undefined },
      { phase: "repository-intelligence", durationMs: repoMs, result: `hotspots=${repoAnalysis.hotspots.length}`, error: undefined },
      { phase: "dependency-intelligence", durationMs: depMs, result: `chains=${depAnalysis.chains.length}`, error: undefined },
      { phase: "documentation-intelligence", durationMs: docMs, result: `docs=${docAnalysis.docs.length}`, error: undefined },
      { phase: "architecture-intelligence", durationMs: archMs, result: `subsystems=${archAnalysis.subsystems.length}`, error: undefined },
      { phase: "verification-intelligence", durationMs: verMs, result: `passed=${verAnalysis.mergedResults.filter((r) => r.passed).length}`, error: undefined },
      { phase: "context-intelligence", durationMs: ctxMs, result: `quality=${(ctxReport.averageConfidence * 100).toFixed(0)}%`, error: undefined },
    ],
  } as PipelineState
})
