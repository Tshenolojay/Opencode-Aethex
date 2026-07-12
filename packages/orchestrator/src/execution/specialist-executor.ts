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

const execute: Interface["execute"] = Effect.fn("SpecialistExecutor.execute")(function* (input) {
  const registry = yield* SpecialistRegistry.Service
  const specialist = yield* registry.getSpecialist(input.specialist.id)

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

  const result: SpecialistResult = {
    specialistID: input.specialist.id,
    specialistName: input.specialist.name,
    executionTime: endTime - startTime,
    startTime, endTime,
    confidence: 0.3,
    capabilitiesUsed: input.specialist.requiredCapabilities,
    collectedKnowledge: [],
    contextUsed: undefined,
    modelCandidate: assignment.primary,
    warnings: [`Specialist ${input.specialist.id} not registered — using fallback`],
    errors: [],
    metadata: { executionPhase: "specialist-execution" },
  }
  return result
}) as unknown as Interface["execute"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ execute })
  }),
)

export { layer }
