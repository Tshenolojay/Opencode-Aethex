export * as ConfidenceLearning from "./confidence-learning"

import { Context, Effect, Layer, Ref } from "effect"
import { DecisionHistory, type OutcomeLabel } from "./decision-history"

export interface ConfidenceAdjustment {
  readonly taskType: string
  readonly weightCorrection: number
  readonly previousWeight: number
  readonly newWeight: number
  readonly reason: string
  readonly accuracy: number
  readonly observations: number
}

export interface Interface {
  readonly getConfidenceAdjustments: () => Effect.Effect<readonly ConfidenceAdjustment[]>
  readonly learnFromDecision: (taskType: string, outcomeLabel: OutcomeLabel, expectedAccuracy: number) => Effect.Effect<ConfidenceAdjustment | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConfidenceLearning") {}

interface ConfidenceLearningState {
  readonly accuracyTracking: Readonly<Record<string, { correct: number; total: number; lastWeight: number }>>
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const history = yield* DecisionHistory.Service
    const initialState: ConfidenceLearningState = { accuracyTracking: {} }
    const state = yield* Ref.make<ConfidenceLearningState>(initialState)

    const getConfidenceAdjustments: Interface["getConfidenceAdjustments"] = Effect.fn("ConfidenceLearning.getConfidenceAdjustments")(function* () {
      const s = yield* Ref.get(state)
      return Object.entries(s.accuracyTracking).map(([taskType, data]) => ({
        taskType,
        weightCorrection: data.correct / Math.max(data.total, 1),
        previousWeight: data.lastWeight,
        newWeight: data.correct / Math.max(data.total, 1),
        reason: `historical accuracy: ${(data.correct / Math.max(data.total, 1) * 100).toFixed(0)}%`,
        accuracy: data.correct / Math.max(data.total, 1),
        observations: data.total,
      }))
    })

    const learnFromDecision: Interface["learnFromDecision"] = Effect.fn("ConfidenceLearning.learnFromDecision")(function* (taskType, outcomeLabel, expectedAccuracy) {
      const s = yield* Ref.get(state)
      const current = s.accuracyTracking[taskType] ?? { correct: 0, total: 0, lastWeight: 0 }
      const total = current.total + 1
      const correct = current.correct + (outcomeLabel === "success" ? 1 : 0)
      const newAccuracy = correct / total
      const weightDiff = newAccuracy - expectedAccuracy

      yield* Ref.update(state, (s) => ({
        ...s,
        accuracyTracking: { ...s.accuracyTracking, [taskType]: { correct, total, lastWeight: newAccuracy } },
      }))

      if (Math.abs(weightDiff) > 0.1) {
        return {
          taskType,
          weightCorrection: weightDiff,
          previousWeight: current.lastWeight,
          newWeight: newAccuracy,
          reason: outcomeLabel === "success" ? "confirmed prediction" : "adjusting for outcome mismatch",
          accuracy: newAccuracy,
          observations: total,
        }
      }
      return undefined
    })

    return Service.of({ getConfidenceAdjustments, learnFromDecision })
  }),
)

export { layer }
