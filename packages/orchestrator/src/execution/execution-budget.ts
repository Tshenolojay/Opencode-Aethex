export * as ExecutionBudget from "./execution-budget"

import { Context, Effect, Layer, Ref } from "effect"

export interface BudgetLimits {
  readonly maxTokens: number
  readonly maxTimeMs: number
  readonly maxCost: number
  readonly maxRetries: number
  readonly maxParallel: number
  readonly maxSpecialists: number
  readonly maxConsensusRounds: number
}

export interface BudgetConsumption {
  readonly tokensConsumed: number
  readonly timeMs: number
  readonly cost: number
  readonly retries: number
  readonly parallelSlots: number
  readonly specialistsUsed: number
  readonly consensusRounds: number
}

export interface BudgetState {
  readonly limits: BudgetLimits
  readonly consumption: BudgetConsumption
  readonly exceeded: readonly string[]
}

export const DEFAULT_LIMITS: BudgetLimits = {
  maxTokens: 100000,
  maxTimeMs: 60000,
  maxCost: 1.0,
  maxRetries: 5,
  maxParallel: 4,
  maxSpecialists: 8,
  maxConsensusRounds: 3,
}

export interface Interface {
  readonly initialize: (limits?: Partial<BudgetLimits>) => Effect.Effect<void>
  readonly consumeTokens: (tokens: number) => Effect.Effect<boolean>
  readonly consumeTime: (ms: number) => Effect.Effect<boolean>
  readonly consumeCost: (cost: number) => Effect.Effect<boolean>
  readonly incrementRetries: () => Effect.Effect<boolean>
  readonly incrementSpecialists: () => Effect.Effect<boolean>
  readonly incrementConsensusRounds: () => Effect.Effect<boolean>
  readonly getState: () => Effect.Effect<BudgetState>
  readonly getRemaining: () => Effect.Effect<BudgetConsumption>
  readonly hasBudget: (dimension: string) => Effect.Effect<boolean>
  readonly reset: () => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionBudget") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<BudgetState>({
      limits: DEFAULT_LIMITS,
      consumption: {
        tokensConsumed: 0, timeMs: 0, cost: 0, retries: 0,
        parallelSlots: 0, specialistsUsed: 0, consensusRounds: 0,
      },
      exceeded: [],
    })

    function checkAndUpdate<T extends keyof BudgetConsumption>(
      dimension: T,
      limitKey: keyof BudgetLimits,
      amount: number,
      update: (prev: BudgetConsumption) => BudgetConsumption,
    ): Effect.Effect<boolean> {
      return Effect.fn("ExecutionBudget.check")(function* () {
        const s = yield* Ref.get(state)
        const limit = s.limits[limitKey] as number
        const current = s.consumption[dimension] as number
        const after = current + amount
        if (after > limit) {
          yield* Ref.update(state, (s) => ({
            ...s,
            exceeded: s.exceeded.includes(dimension as string) ? s.exceeded : [...s.exceeded, dimension as string],
          }))
          return false
        }
        yield* Ref.update(state, (s) => ({
          ...s,
          consumption: update(s.consumption),
        }))
        return true
      })()
    }

    const result: Interface = {
      initialize: Effect.fn("ExecutionBudget.initialize")(function* (limits) {
        yield* Ref.set(state, {
          limits: { ...DEFAULT_LIMITS, ...limits },
          consumption: {
            tokensConsumed: 0, timeMs: 0, cost: 0, retries: 0,
            parallelSlots: 0, specialistsUsed: 0, consensusRounds: 0,
          },
          exceeded: [],
        })
      }),

      consumeTokens: (tokens) => checkAndUpdate("tokensConsumed", "maxTokens", tokens, (c) => ({ ...c, tokensConsumed: c.tokensConsumed + tokens })),
      consumeTime: (ms) => checkAndUpdate("timeMs", "maxTimeMs", ms, (c) => ({ ...c, timeMs: c.timeMs + ms })),
      consumeCost: (cost) => checkAndUpdate("cost", "maxCost", cost, (c) => ({ ...c, cost: c.cost + cost })),
      incrementRetries: () => checkAndUpdate("retries", "maxRetries", 1, (c) => ({ ...c, retries: c.retries + 1 })),
      incrementSpecialists: () => checkAndUpdate("specialistsUsed", "maxSpecialists", 1, (c) => ({ ...c, specialistsUsed: c.specialistsUsed + 1 })),
      incrementConsensusRounds: () => checkAndUpdate("consensusRounds", "maxConsensusRounds", 1, (c) => ({ ...c, consensusRounds: c.consensusRounds + 1 })),

      getState: Effect.fn("ExecutionBudget.getState")(function* () {
        return yield* Ref.get(state)
      }),

      getRemaining: Effect.fn("ExecutionBudget.getRemaining")(function* () {
        const s = yield* Ref.get(state)
        return {
          tokensConsumed: s.limits.maxTokens - s.consumption.tokensConsumed,
          timeMs: s.limits.maxTimeMs - s.consumption.timeMs,
          cost: s.limits.maxCost - s.consumption.cost,
          retries: s.limits.maxRetries - s.consumption.retries,
          parallelSlots: s.limits.maxParallel - s.consumption.parallelSlots,
          specialistsUsed: s.limits.maxSpecialists - s.consumption.specialistsUsed,
          consensusRounds: s.limits.maxConsensusRounds - s.consumption.consensusRounds,
        }
      }),

      hasBudget: Effect.fn("ExecutionBudget.hasBudget")(function* (dimension) {
        const s = yield* Ref.get(state)
        return !s.exceeded.includes(dimension)
      }),

      reset: Effect.fn("ExecutionBudget.reset")(function* () {
        yield* Ref.set(state, {
          limits: DEFAULT_LIMITS,
          consumption: {
            tokensConsumed: 0, timeMs: 0, cost: 0, retries: 0,
            parallelSlots: 0, specialistsUsed: 0, consensusRounds: 0,
          },
          exceeded: [],
        })
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
