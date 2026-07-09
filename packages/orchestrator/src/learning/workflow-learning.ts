export * as WorkflowLearning from "./workflow-learning"

import { Context, Effect, Layer, Ref } from "effect"

export interface WorkflowEffectiveness {
  readonly workflowID: string
  readonly effectivenessScore: number
  readonly totalExecutions: number
  readonly successRate: number
  readonly averageDuration: number
  readonly lastUsed: number
}

export interface Interface {
  readonly assessEffectiveness: () => Effect.Effect<readonly WorkflowEffectiveness[]>
  readonly recommendBestWorkflow: (taskType: string) => Effect.Effect<string | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/WorkflowLearning") {}

interface LearnedPattern {
  readonly taskType: string
  readonly workflowID: string
  readonly effectiveness: WorkflowEffectiveness
}

interface WorkflowLearningState {
  readonly learnedPatterns: LearnedPattern[]
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<WorkflowLearningState>({ learnedPatterns: [] })

    const assessEffectiveness: Interface["assessEffectiveness"] = Effect.fn("WorkflowLearning.assessEffectiveness")(function* () {
      const s = yield* Ref.get(state)
      return s.learnedPatterns.map((p) => p.effectiveness)
    })

    const recommendBestWorkflow: Interface["recommendBestWorkflow"] = Effect.fn("WorkflowLearning.recommendBestWorkflow")(function* (taskType) {
      const s = yield* Ref.get(state)
      const candidates = s.learnedPatterns.filter((p) => p.taskType === taskType)
      if (candidates.length === 0) return undefined
      return candidates.reduce((best, curr) =>
        curr.effectiveness.effectivenessScore > best.effectiveness.effectivenessScore ? curr : best,
      ).workflowID
    })

    return Service.of({ assessEffectiveness, recommendBestWorkflow })
  }),
)

export { layer }
