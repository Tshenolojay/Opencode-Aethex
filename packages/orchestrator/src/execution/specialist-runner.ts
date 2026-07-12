export * as SpecialistRunner from "./specialist-runner"

import { Context, Effect, Exit, Layer } from "effect"
import type { Graph } from "../planner/execution-graph"
import { ExecutionScheduler } from "./execution-scheduler"
import { SpecialistExecutor } from "./specialist-executor"
import { FailureRecovery } from "./recovery"
import { SpecialistRegistry } from "../specialists/registry"
import type { SpecialistResult } from "./specialist-result"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { TaskType } from "../types/classification"
import type { ExecutionPackage } from "../integration/execution-package"

export interface RunnerInput {
  readonly graph: Graph
  readonly policy: PlanningPolicy
  readonly capabilityPlan: CapabilityPlan
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly knowledgeBundle: KnowledgeBundle
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly repositorySize: number
  readonly executionPackage?: ExecutionPackage | undefined
}

export interface RunnerOutput {
  readonly results: readonly SpecialistResult[]
  readonly completed: readonly string[]
  readonly failed: readonly string[]
  readonly partial: boolean
}

export interface Interface {
  readonly run: (input: RunnerInput) => Effect.Effect<RunnerOutput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRunner") {}

const run: Interface["run"] = Effect.fn("SpecialistRunner.run")(function* (input) {
  const scheduler = yield* ExecutionScheduler.Service
  const executor = yield* SpecialistExecutor.Service
  const recovery = yield* FailureRecovery.Service
  const registry = yield* SpecialistRegistry.Service

  const schedule = yield* scheduler.schedule({
    graph: input.graph,
    policy: input.policy,
    capabilityPlan: input.capabilityPlan,
    knowledgePlan: input.knowledgePlan,
    repositorySize: input.repositorySize,
  })

  const results: SpecialistResult[] = []
  const completed: string[] = []
  const failed: string[] = []

  for (const batch of schedule.batches) {
    const batchResults = yield* Effect.forEach(
      batch.nodeIDs,
      (nodeID) =>
        recovery.withTimeout(
          recovery.attempt(() => executor.execute({
            specialist: findSpecialist(input.graph, nodeID, registry),
            taskObjective: input.taskObjective,
            taskType: input.taskType,
            knowledgeBundle: input.knowledgeBundle,
            knowledgePlan: input.knowledgePlan,
            capabilityPlan: input.capabilityPlan,
            executionPackage: input.executionPackage,
          })),
          recoveryWithConfig().timeoutMs,
        ).pipe(
          Effect.exit,
          Effect.map((exit) => ({ nodeID, exit })),
        ),
      { concurrency: batch.parallel ? "unbounded" : 1 },
    )

    for (const { nodeID, exit } of batchResults) {
      if (exit._tag === "Success") {
        results.push(exit.value)
        completed.push(nodeID)
      } else {
        failed.push(nodeID)
      }
    }
  }

  const partial = failed.length > 0 && completed.length > 0

  return { results, completed, failed, partial }
}) as unknown as Interface["run"]

function findSpecialist(graph: Graph, nodeID: string, registry: { getSpecialist: (id: string) => Effect.Effect<import("../specialists/base-specialist").BaseSpecialistInterface | undefined> }): import("../specialists/profiles").SpecialistProfile {
  const node = graph.nodes.find((n) => n.id === nodeID)
  if (!node) throw new Error(`Node not found: ${nodeID}`)
  const profileFromRegistry = registry.getSpecialist(nodeID)
  // Profile used by caller; actual specialist lookup happens in executor via registry.getSpecialist
  return {
    id: node.id,
    name: node.label,
    description: node.description,
    purpose: node.description,
    requiredCapabilities: nodeID === "specialist/repository" ? ["repository-understanding", "analysis"] as const
      : nodeID === "specialist/architecture" ? ["repository-understanding", "analysis", "reasoning"] as const
      : nodeID === "specialist/dependency" ? ["search", "analysis"] as const
      : nodeID === "specialist/documentation" ? ["search", "long-context"] as const
      : nodeID === "specialist/verification" ? ["analysis", "tool-use", "code-generation"] as const
      : nodeID === "specialist/search" ? ["search", "repository-understanding"] as const
      : nodeID === "specialist/planning" ? ["planning", "reasoning", "analysis"] as const
      : nodeID === "specialist/context" ? ["long-context", "reasoning", "analysis"] as const
      : [] as const,
    preferredKnowledge: [],
    executionPriority: 1,
    supportsParallelExecution: false,
    mission: undefined,
    primaryObjective: undefined,
    responsibilities: undefined,
    knowledgeSources: undefined,
    expertise: undefined,
    produces: undefined,
    consumes: undefined,
    requires: undefined,
    preferredCapabilities: undefined,
    optionalCapabilities: undefined,
    secondaryCapabilities: undefined,
    fallbackCapabilities: undefined,
    specialistStrengths: undefined,
    specialistWeaknesses: undefined,
    specialistPreferences: undefined,
    maximumContext: undefined,
    priorityWeight: undefined,
    confidenceWeight: undefined,
    executionCost: undefined,
    expectedRuntimeMs: undefined,
    recoveryStrategy: undefined,
    retryPolicy: undefined,
    timeoutPolicy: undefined,
    maxRetries: undefined,
    timeoutMs: undefined,
    reviewRequirements: undefined,
    reviewResponsibilities: undefined,
    approvalRequirements: undefined,
    memoryRequirements: undefined,
    cachePolicy: undefined,
    collaborationRules: undefined,
    validationRules: undefined,
    metrics: undefined,
    diagnostics: undefined,
    contract: { requires: [], consumes: [], produces: [], provides: [], validates: [], reviews: [], approves: [], dependsOn: [], canExecuteInParallel: false, canExecuteSequentially: true, canSkip: false, canReuse: true, canRetry: true, canEscalate: true },
    lifecycle: undefined,
    decisionRules: undefined,
    modelRequirements: undefined,
  }
}

function recoveryWithConfig() {
  return { maxRetries: 3, retryDelayMs: 500, timeoutMs: 15000 }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ run })
  }),
)

export { layer }
