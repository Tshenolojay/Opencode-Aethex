export * as SpecialistRuntime from "./specialist-runtime"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import { PromptBuilder } from "../prompts/prompt-builder"
import { RuntimeCache } from "./runtime-cache"
import { RuntimeValidator } from "./runtime-validator"
import { RuntimeFallback } from "./runtime-fallback"
import { RuntimeResult, fromSpecialistResult } from "./runtime-result"
import type { RuntimeContextData } from "./runtime-context"
import { SpecialistExecutor } from "../execution/specialist-executor"
import { CloudExecutionAdapter } from "../execution/cloud-execution-adapter"
import { ExecutionBudget } from "../execution/execution-budget"
import { SpecialistSession } from "../session/specialist-session"
import { SpecialistConversation } from "../session/specialist-conversation"
import type { SpecialistResult, ModelCandidate } from "../execution/specialist-result"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { TaskType } from "../types/classification"

export interface RuntimeInput {
  readonly specialist: SpecialistProfile
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly knowledgeBundle: KnowledgeBundle
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly runtimeContext: RuntimeContextData
  readonly sessionID: string
  readonly modelAssignment?: {
    readonly primary: ModelCandidate | undefined
    readonly fallback: ModelCandidate | undefined
  }
}

export interface RuntimeOutput {
  readonly runtimeResult: RuntimeResult
  readonly specialistResult: SpecialistResult
  readonly cached: boolean
  readonly attempts: number
  readonly sessionID: string | undefined
  readonly cloudExecuted: boolean
  readonly budgetRemaining: boolean
}

export interface Interface {
  readonly execute: (input: RuntimeInput) => Effect.Effect<RuntimeOutput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRuntime") {}

const execute = Effect.fn("SpecialistRuntime.execute")(function* (input: RuntimeInput) {
  const cache = yield* RuntimeCache.Service
  const validator = yield* RuntimeValidator.Service
  const fallback = yield* RuntimeFallback.Service
  const promptBuilder = yield* PromptBuilder.Service
  const executor = yield* SpecialistExecutor.Service
  const cloudAdapter = yield* CloudExecutionAdapter.Service
  const budget = yield* ExecutionBudget.Service
  const sessionSvc = yield* SpecialistSession.Service
  const conversation = yield* SpecialistConversation.Service

  const sessionID = yield* sessionSvc.create(input.specialist, input.specialist.executionPriority)

  if (input.modelAssignment?.primary) {
    yield* sessionSvc.assignModel(sessionID, input.modelAssignment.primary, input.modelAssignment.fallback)
  }

  yield* sessionSvc.updateStatus(sessionID, "preparing")

  const cacheKey = `specialist:${input.specialist.id}:${input.taskType}` as const

  const cachedValue = yield* cache.get(cacheKey)
  if (cachedValue) {
    const cached: SpecialistResult = JSON.parse(cachedValue) as SpecialistResult
    const runtimeResult = fromSpecialistResult(cached, { attempt: 1, cacheHit: true })
    yield* sessionSvc.updateStatus(sessionID, "completed")
    return { runtimeResult, specialistResult: cached, cached: true, attempts: 1, sessionID, cloudExecuted: false, budgetRemaining: true }
  }

  const prompt = yield* promptBuilder.buildPrompt(
    input.specialist.id,
    input.specialist.name,
    input.runtimeContext,
    input.taskObjective,
  )

  yield* sessionSvc.updateStatus(sessionID, "executing")

  const maxAttempts = 3
  let lastResult: SpecialistResult | undefined
  let lastError: string | undefined
  let cloudExecuted = false
  let budgetRemaining = true

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    budgetRemaining = yield* budget.hasBudget("timeMs")
    if (!budgetRemaining) {
      yield* sessionSvc.addMessage(sessionID, {
        id: `sys-${Date.now()}`, from: "system", to: input.specialist.id,
        type: "warning", content: "execution budget exceeded", timestamp: Date.now(), confidence: undefined,
      })
      break
    }

    const result = yield* Effect.exit(executor.execute({
      specialist: input.specialist,
      taskObjective: prompt.userPrompt,
      taskType: input.taskType,
      knowledgeBundle: input.knowledgeBundle,
      knowledgePlan: input.knowledgePlan,
      capabilityPlan: input.capabilityPlan,
    }))

    if (result._tag === "Success") {
      lastResult = result.value
      cloudExecuted = result.value.metadata["cloud-executed"] === "true"

      const validation = yield* validator.validate(
        fromSpecialistResult(result.value, { attempt, cacheHit: false }),
        input.specialist.preferredKnowledge,
      )

      if (validation.valid) {
        yield* cache.put(cacheKey, JSON.stringify(result.value))
        const runtimeResult = fromSpecialistResult(result.value, { attempt, cacheHit: false })
        yield* sessionSvc.addKnowledge(sessionID, {
          id: `k-${Date.now()}`, type: "execution-result", content: JSON.stringify(result.value),
          source: input.specialist.id, confidence: result.value.confidence,
          timestamp: Date.now(), owner: input.specialist.id,
          provenance: [], dependencies: [],
        })
        yield* sessionSvc.updateStatus(sessionID, "completed")
        yield* budget.consumeTime(result.value.executionTime)
        return { runtimeResult, specialistResult: result.value, cached: false, attempts: attempt, sessionID, cloudExecuted, budgetRemaining }
      }

      if (attempt < maxAttempts) {
        const fallbackDecision = yield* fallback.decide(
          fromSpecialistResult(result.value, { attempt, cacheHit: false }),
          {
            backupModel: input.modelAssignment?.fallback,
            attempts: attempt,
            maxAttempts,
          },
        )

        if (!fallbackDecision.shouldRetry) {
          const runtimeResult = fromSpecialistResult(result.value, { attempt, cacheHit: false })
          yield* sessionSvc.addMessage(sessionID, {
            id: `fb-${Date.now()}`, from: "system", to: input.specialist.id,
            type: "warning", content: fallbackDecision.reason,
            timestamp: Date.now(), confidence: undefined,
          })
          yield* sessionSvc.updateStatus(sessionID, "completed")
          yield* budget.consumeTime(result.value.executionTime)
          return { runtimeResult, specialistResult: result.value, cached: false, attempts: attempt, sessionID, cloudExecuted, budgetRemaining }
        }

        yield* budget.incrementRetries()
      }
    } else {
      lastError = "Execution failed"
      yield* budget.incrementRetries()
    }
  }

  if (lastResult) {
    const runtimeResult = fromSpecialistResult(lastResult, { attempt: maxAttempts, cacheHit: false })
    yield* sessionSvc.updateStatus(sessionID, "failed")
    return { runtimeResult, specialistResult: lastResult, cached: false, attempts: maxAttempts, sessionID, cloudExecuted, budgetRemaining }
  }

  yield* sessionSvc.updateStatus(sessionID, "failed")
  return yield* Effect.die(new Error(lastError ?? "Specialist execution failed after max attempts"))
}) as Interface["execute"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ execute })
  }),
)

export { layer }
