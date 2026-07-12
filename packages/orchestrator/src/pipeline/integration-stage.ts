import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import type { AgentAdapterViews   } from "../integration/agent-adapter"
import { ExecutionPackageBuilder } from "../integration/execution-package-builder"
import type { ExecutionPackage } from "../integration/execution-package"
import { AgentContext as AgentContextService } from "../integration/agent-context"
import { AgentHints as AgentHintsService } from "../integration/agent-hints"
import { AgentCapabilities as AgentCapabilitiesService } from "../integration/agent-capabilities"
import { AgentSelectionAdvice as AgentSelectionAdviceService } from "../integration/agent-selection-advice"
import { PromptAugmentation as PromptAugmentationService } from "../integration/prompt-augmentation"
import { AgentEnhancer } from "../integration/agent-enhancer"
import { AgentAdapter } from "../integration/agent-adapter"
import { ExecutionAdvisor } from "../intelligence/execution-advisor"
import { ContextCompressor } from "../intelligence/context-compressor"
import { RuntimeMetrics } from "../runtime/runtime-metrics"
import { PlanningMemory } from "../planner/planning-memory"
import { ExecutionSummaryView } from "../views/execution-summary-view"
import { RepositoryView } from "../views/repository-view"
import { ArchitectureView } from "../views/architecture-view"
import { DependencyView } from "../views/dependency-view"
import { DocumentationView } from "../views/documentation-view"
import { VerificationView } from "../views/verification-view"
import { ReasoningView } from "../views/reasoning-view"
import { PlanningView } from "../views/planning-view"
import { WorkflowView } from "../views/workflow-view"
import { ConnectorView } from "../views/connector-view"

export const runIntegrationStage = Effect.fn("Pipeline.integration")(function* (state: PipelineState) {
  const pkgBuilder = yield* ExecutionPackageBuilder.Service
  const agentContext = yield* AgentContextService.Service
  const agentHintsService = yield* AgentHintsService.Service
  const agentCapsService = yield* AgentCapabilitiesService.Service
  const agentSelectionService = yield* AgentSelectionAdviceService.Service
  const promptAugmentationService = yield* PromptAugmentationService.Service
  const agentEnhancer = yield* AgentEnhancer.Service
  const agentAdapter = yield* AgentAdapter.Service
  const executionAdvisor = yield* ExecutionAdvisor.Service
  const contextCompressor = yield* ContextCompressor.Service
  const runtimeMetrics = yield* RuntimeMetrics.Service
  const memory = yield* PlanningMemory.Service
  const executionSummaryView = yield* ExecutionSummaryView.Service
  const repositoryView = yield* RepositoryView.Service
  const architectureView = yield* ArchitectureView.Service
  const dependencyView = yield* DependencyView.Service
  const documentationView = yield* DocumentationView.Service
  const verificationView = yield* VerificationView.Service
  const reasoningView = yield* ReasoningView.Service
  const planningView = yield* PlanningView.Service
  const workflowView = yield* WorkflowView.Service
  const connectorView = yield* ConnectorView.Service

  const runtimeManagerMetrics = state.runtimeOutput?.metrics
  const runtimeOutput = state.runtimeOutput
  const tBuild = Date.now()
  const ep = yield* pkgBuilder.build({
    sessionID: state.input.sessionID,
    taskClassification: state.classification,
    classifications: state.classifications,
    confidence: state.confidenceLevel,
    confidenceScore: state.confidenceScore,
    capabilityPlan: state.capabilityPlan,
    specialistPlan: state.specialistPlan,
    knowledgePlan: state.knowledgePlan,
    dispatchPlan: state.dispatchPlan,
    planningPolicy: state.policy,
    executionGraph: state.executionGraph,
    knowledgeBundle: state.knowledgeBundle,
    repositoryIntelligence: state.repoAnalysis,
    dependencyIntelligence: state.depAnalysis,
    architectureIntelligence: state.archAnalysis,
    documentationIntelligence: state.docAnalysis,
    verificationIntelligence: state.verAnalysis,
    contextIntelligence: state.ctxReport,
    runtimeMetrics: runtimeManagerMetrics
      ? {
          executionDurationMs: runtimeManagerMetrics.totalDurationMs,
          retries: runtimeManagerMetrics.retryCount,
          failures: runtimeManagerMetrics.failureCount,
          cacheHits: runtimeManagerMetrics.cacheHitCount,
          cacheMisses: runtimeManagerMetrics.cacheMissCount,
          providerLatencyMs: 0,
          modelLatencyMs: 0,
          knowledgeSize: runtimeManagerMetrics.totalKnowledgeEntries,
          executionThroughput: runtimeManagerMetrics.totalDurationMs > 0
            ? runtimeManagerMetrics.totalKnowledgeEntries / (runtimeManagerMetrics.totalDurationMs / 1000)
            : 0,
        }
      : undefined,
    executionNotes: runtimeOutput && runtimeOutput.failed.length > 0
      ? [`${runtimeOutput.failed.length} specialist(s) failed`]
      : undefined,
  })
  yield* runtimeMetrics.recordPackageBuildTime(Date.now() - tBuild)

  const agentProfile = yield* agentContext.prepare(ep)

  const hints = yield* agentHintsService.generate(ep, agentProfile.agentType)

  const selectionAdvice = yield* agentSelectionService.advise(ep)

  const executionSummaryData = yield* executionSummaryView.project(ep)
  const repositoryData = yield* repositoryView.project(ep)
  const architectureData = yield* architectureView.project(ep)
  const dependencyData = yield* dependencyView.project(ep)
  const documentationData = yield* documentationView.project(ep)
  const verificationData = yield* verificationView.project(ep)
  const reasoningData = yield* reasoningView.project(ep)
  const planningData = yield* planningView.project(ep)
  const workflowData = yield* workflowView.project(ep)
  const connectorData = yield* connectorView.project(ep)

  const views: AgentAdapterViews = {
    executionSummary: `${executionSummaryData.taskType} (complexity: ${executionSummaryData.complexity}, confidence: ${executionSummaryData.confidence})`,
    repositorySummary: repositoryData.summary,
    architectureSummary: architectureData.summary,
    dependencySummary: dependencyData.summary,
    documentationSummary: documentationData.summary,
    verificationSummary: verificationData.summary,
    reasoningSummary: reasoningData.narrative,
    planningSummary: `${planningData.capabilityCount} capabilities, ${planningData.specialistCount} specialists`,
    workflowSummary: workflowData.workflowAdvice ?? workflowData.executionStrategy,
    connectorSummary: connectorData.sourceTypes.join(", "),
    teamSummary: undefined,
  }

  const tAug = Date.now()
  const promptAug = yield* promptAugmentationService.build(ep)
  yield* runtimeMetrics.recordPromptAugmentationTime(Date.now() - tAug)

  yield* agentEnhancer.enhance(ep, agentProfile)
  const adapted = yield* agentAdapter.enrich(ep, views)

  const tIntel = Date.now()
  const executionIntelligence = yield* executionAdvisor.advise(ep)
  const intelTime = Date.now() - tIntel
  yield* runtimeMetrics.recordAdvisorTime(intelTime)
  yield* runtimeMetrics.recordExecutionIntelligenceTime(intelTime)

  const tCompress = Date.now()
  const compression = yield* contextCompressor.compress(ep)
  yield* runtimeMetrics.recordCompressionTime(Date.now() - tCompress)
  if (compression.savedBytes > 0) {
    yield* runtimeMetrics.recordReuseSavings(compression.savedBytes)
    yield* memory.recordReuseSavings(compression.savedBytes)
  }

  const summaries: [string, string | undefined][] = [
    ["repository", state.repoAnalysis?.enrichedSummary ?? state.knowledgeBundle.repositorySummary],
    ["architecture", state.archAnalysis?.summary ?? state.knowledgeBundle.architectureSummary],
    ["dependency", state.depAnalysis?.summary],
    ["documentation", state.docAnalysis?.summary],
    ["verification", state.verAnalysis?.summary],
  ]
  for (const [type, value] of summaries) {
    if (!value) continue
    const existing = yield* memory.getSummary(type)
    if (existing) yield* memory.recordReuse(type)
    yield* memory.cacheSummary(type, value)
  }

  const tStage = Date.now()

  return {
    ...state,
    executionPackage: {
      ...ep,
      agentContextProfile: agentProfile,
      agentHints: hints,
      agentSelectionAdvice: selectionAdvice,
      promptAugmentation: promptAug,
      executionIntelligence,
      compressedContext: compression.compressedContext,
    },
    diagnostics: [
      ...state.diagnostics,
      { phase: "integration-layer", durationMs: Date.now() - tStage, result: `package-built agent=${agentProfile.agentType} hints=${hints.hints.length}`, error: undefined },
    ],
  } as PipelineState
})
