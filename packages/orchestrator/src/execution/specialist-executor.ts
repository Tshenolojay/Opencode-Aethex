export * as SpecialistExecutor from "./specialist-executor"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import { SpecialistRegistry } from "../specialists/registry"
import { ModelAssignment } from "./model-assignment"
import type { SpecialistResult } from "./specialist-result"
import type { TaskType } from "../types/classification"
import type { ExecutionPackage } from "../integration/execution-package"
import type { BaseSpecialistInterface } from "../specialists/base-specialist"

export interface ExecutorInput {
  readonly specialist: SpecialistProfile
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly knowledgeBundle: KnowledgeBundle
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly executionPackage?: ExecutionPackage | undefined
}

export interface Interface {
  readonly execute: (input: ExecutorInput) => Effect.Effect<SpecialistResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistExecutor") {}

const factories: Record<string, () => Promise<{ make: () => Effect.Effect<BaseSpecialistInterface, never, unknown> }>> = {
  "specialist/search": () => import("../specialists/search-specialist"),
  "specialist/repository": () => import("../specialists/repository-specialist"),
  "specialist/dependency": () => import("../specialists/dependency-specialist"),
  "specialist/documentation": () => import("../specialists/documentation-specialist"),
  "specialist/architecture": () => import("../specialists/architecture-specialist"),
  "specialist/verification": () => import("../specialists/verification-specialist"),
  "specialist/context": () => import("../specialists/context-specialist"),
  "specialist/planning": () => import("../specialists/planning-specialist"),
}

const resolveSpecialist = Effect.fn("SpecialistExecutor.resolveSpecialist")(function* (id: string) {
  const registry = yield* SpecialistRegistry.Service
  const existing = yield* registry.getSpecialist(id)
  if (existing) return existing

  const load = factories[id]
  if (!load) return undefined

  const mod = yield* Effect.promise(load)
  // Specialist make() registers itself into the shared registry as a side effect.
  return yield* mod.make()
})

const execute: Interface["execute"] = Effect.fn("SpecialistExecutor.execute")(function* (input) {
  const specialist = yield* resolveSpecialist(input.specialist.id)

  if (specialist) {
    const result = yield* specialist.execute({
      bundle: input.knowledgeBundle,
      taskObjective: input.taskObjective,
      taskType: input.taskType,
      sessionID: "",
      executionPackage: input.executionPackage,
    })
    return result
  }

  const startTime = Date.now()
  const modelAssignment = yield* ModelAssignment.Service

  const assignment = yield* modelAssignment.assign({
    specialistCapabilities: input.specialist.requiredCapabilities,
    taskComplexity: input.capabilityPlan?.highPriority.length ?? 1,
  })

  const endTime = Date.now()

  return {
    specialistID: input.specialist.id,
    specialistName: input.specialist.name,
    executionTime: endTime - startTime,
    startTime,
    endTime,
    confidence: 0.3,
    capabilitiesUsed: input.specialist.requiredCapabilities,
    collectedKnowledge: [
      {
        type: "fallback-model-assignment",
        content: `Assigned ${assignment.primary?.modelID ?? "default"} for ${input.specialist.name}`,
        source: input.specialist.id,
        confidence: 0.3,
        timestamp: startTime,
      },
    ],
    contextUsed: undefined,
    modelCandidate: assignment.primary,
    warnings: [`Specialist ${input.specialist.id} factory unavailable — using model-assignment fallback`],
    errors: [],
    metadata: { executionPhase: "specialist-execution", fallback: true },
  } satisfies SpecialistResult
}) as unknown as Interface["execute"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ execute })
  }),
)

export { layer }
