import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { ModelSelector } from "../selector/selector"
import { CapabilityPlanner } from "../planner/capability-planner"
import { SpecialistRegistry } from "../specialists/registry"
import { KnowledgePlanner } from "../planner/knowledge-planner"
import { ExecutionGraph as ExecutionGraphBuilder } from "../planner/execution-graph"
import { PlanningPolicy as PlanningPolicyService } from "../planner/planning-policy"
import { PlanningMemory } from "../planner/planning-memory"
import { AgentDispatcher } from "../dispatcher/dispatcher"

export const runPlanningStage = Effect.fn("Pipeline.planning")(function* (state: PipelineState) {
  const selector = yield* ModelSelector.Service
  const capabilityPlanner = yield* CapabilityPlanner.Service
  const specialistRegistry = yield* SpecialistRegistry.Service
  const policyService = yield* PlanningPolicyService.Service
  const dispatcher = yield* AgentDispatcher.Service
  const knowledgePlanner = yield* KnowledgePlanner.Service
  const executionGraphBuilder = yield* ExecutionGraphBuilder.Service
  const memory = yield* PlanningMemory.Service

  yield* memory.initialize(state.input.sessionID)

  const priorPackage = yield* memory.getCachedExecutionPackage
  if (priorPackage && priorPackage.taskClassification.type === state.classification.type) {
    yield* memory.recordPlanningReuse()
  }

  const tCapResolve = Date.now()
  const capabilityProfile = yield* selector.estimateCapabilities({
    taskType: state.classification.type,
    complexity: state.classification.complexity,
    requiresSearch: state.classification.requiresSearch,
    requiresContext: state.classification.requiresContext,
    requiresDependencyGraph: state.classification.requiresDependencyGraph,
    requiresVerification: state.classification.requiresVerification,
  })
  const capResolveMs = Date.now() - tCapResolve

  const requiredCapabilities = capabilityProfile.requirements
    .filter((r) => !r.optional)
    .map((r) => r.capability)

  const tCapPlan = Date.now()
  const capabilityPlan = yield* capabilityPlanner.plan({
    taskClassification: state.classification,
    classifications: state.classifications,
    confidence: state.confidenceLevel,
    confidenceScore: state.confidenceScore!.score,
    repositorySize: state.input.repositorySize,
    conversationLength: state.input.conversationLength,
    sessionMetadata: state.input.sessionMetadata,
  })
  const capPlanMs = Date.now() - tCapPlan
  yield* memory.updateCapabilityPlan(capabilityPlan)

  const tSpecLookup = Date.now()
  const specialistMatches = yield* specialistRegistry.filterByCapabilities(capabilityPlan.required, {
    taskTypes: undefined,
    requiredCapabilities: undefined,
    minConfidence: undefined,
    maxSpecialists: 4,
  })
  const specLookupMs = Date.now() - tSpecLookup

  const policy = yield* policyService.evaluate({
    classification: state.classification,
    classifications: state.classifications,
    confidence: state.confidenceLevel,
    confidenceScore: state.confidenceScore!.score,
    repositorySize: state.input.repositorySize,
    capabilities: capabilityPlan.required,
  })
  yield* memory.updatePolicy(policy)

  const tSpecPlan = Date.now()
  const specialistPlan = yield* dispatcher.planSpecialists({
    taskType: state.classification.type,
    specialists: specialistMatches,
    capabilities: capabilityPlan.required,
    requiresSearch: state.classification.requiresSearch,
    requiresContext: state.classification.requiresContext,
    requiresDependencyGraph: state.classification.requiresDependencyGraph,
    requiresVerification: state.classification.requiresVerification,
    maxSpecialists: policy.maxSpecialists,
  })
  const specPlanMs = Date.now() - tSpecPlan
  yield* memory.updateSpecialistPlan(specialistPlan)

  const tDispatch = Date.now()
  const dispatchPlan = yield* dispatcher.planRich({
    taskType: state.classification.type,
    requiresContext: state.classification.requiresContext,
    requiresSearch: state.classification.requiresSearch,
    requiresDependencyGraph: state.classification.requiresDependencyGraph,
    requiresVerification: state.classification.requiresVerification,
    complexity: state.classification.complexity,
    classifications: state.classifications,
    confidenceScore: state.confidenceScore!.score,
  })
  const dispatchMs = Date.now() - tDispatch

  const tKnowledge = Date.now()
  const knowledgePlan = yield* knowledgePlanner.plan({
    taskType: state.classification.type,
    requiredCapabilities: capabilityPlan.required,
    requiresSearch: state.classification.requiresSearch,
    requiresContext: state.classification.requiresContext,
    requiresDependencyGraph: state.classification.requiresDependencyGraph,
    requiresVerification: state.classification.requiresVerification,
    predictedSpecialists: specialistPlan.selected.map((m) => m.specialist.id),
  })
  const knowledgeMs = Date.now() - tKnowledge
  yield* memory.updateKnowledgePlan(knowledgePlan)

  const tGraph = Date.now()
  const graphDeps = specialistPlan.dependencies.map((d) => ({ from: d.from, to: d.to }))
  const graph = yield* executionGraphBuilder.build({
    specialists: specialistPlan.selected.map((m) => m.specialist),
    capabilities: capabilityPlan.required,
    knowledgeRequests: knowledgePlan.requests.map((r) => ({ id: r.id, knowledgeType: r.knowledgeType })),
    specialistDependencies: graphDeps,
  })
  const graphMs = Date.now() - tGraph
  yield* memory.updateExecutionGraph(graph)

  return {
    ...state,
    capabilityPlan,
    requiredCapabilities,
    specialistPlan,
    dispatchPlan,
    knowledgePlan,
    policy,
    executionGraph: graph,
    diagnostics: [
      ...state.diagnostics,
      { phase: "capability-resolution", durationMs: capResolveMs, result: `capabilities=${capabilityProfile.recommendedCount}`, error: undefined },
      { phase: "capability-planning", durationMs: capPlanMs, result: `required=${capabilityPlan.required.length}`, error: undefined },
      { phase: "specialist-lookup", durationMs: specLookupMs, result: `matched=${specialistMatches.length}`, error: undefined },
      { phase: "specialist-planning", durationMs: specPlanMs, result: `specialists=${specialistPlan.selected.length}`, error: undefined },
      { phase: "dispatch-planning", durationMs: dispatchMs, result: `agents=${dispatchPlan.requiredAgents.length}`, error: undefined },
      { phase: "knowledge-planning", durationMs: knowledgeMs, result: `requests=${knowledgePlan.requests.length}`, error: undefined },
      { phase: "execution-graph", durationMs: graphMs, result: `nodes=${graph.nodes.length}`, error: undefined },
    ],
  } as PipelineState
})
