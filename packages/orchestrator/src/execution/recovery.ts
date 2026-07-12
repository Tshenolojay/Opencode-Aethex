export * as FailureRecovery from "./recovery"

import { Context, Effect, Layer } from "effect"
import type { SpecialistResult } from "./specialist-result"

export interface RecoveryConfig {
  readonly maxRetries: number
  readonly retryDelayMs: number
  readonly timeoutMs: number
  readonly fallbackModelStrategy: "none" | "same-provider" | "any-provider" | "cheaper" | "faster"
  readonly fallbackProviderStrategy: "none" | "same-region" | "any" | "preferred"
  readonly allowSpecialistFallback: boolean
  readonly allowStrategyChange: boolean
  readonly gracefulCancellation: boolean
}

export const DefaultRecovery: RecoveryConfig = {
  maxRetries: 3,
  retryDelayMs: 500,
  timeoutMs: 15000,
  fallbackModelStrategy: "any-provider",
  fallbackProviderStrategy: "any",
  allowSpecialistFallback: true,
  allowStrategyChange: true,
  gracefulCancellation: true,
}

export interface RetryState {
  readonly attempts: number
  readonly lastError: string | undefined
  readonly fallbackModelUsed: boolean
  readonly fallbackProviderUsed: boolean
  readonly fallbackSpecialistUsed: boolean
  readonly strategyChanged: boolean
}

export interface FallbackPlan {
  readonly useFallbackModel: boolean
  readonly useFallbackProvider: boolean
  readonly useFallbackSpecialist: boolean
  readonly changeStrategy: boolean
  readonly reason: string
}

export interface Interface {
  readonly attempt: <A, E>(
    execute: (state: RetryState) => Effect.Effect<A, E>,
    config?: Partial<RecoveryConfig>,
  ) => Effect.Effect<A, E>
  readonly fallback: <A, E>(
    primary: Effect.Effect<A, E>,
    fallback: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E>
  readonly withTimeout: <A, E>(
    effect: Effect.Effect<A, E>,
    timeoutMs: number,
  ) => Effect.Effect<A, E>
  readonly planFallback: (state: RetryState, config?: Partial<RecoveryConfig>) => FallbackPlan
  readonly cancel: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/FailureRecovery") {}

const attempt: Interface["attempt"] = function <A, E>(
  execute: (state: RetryState) => Effect.Effect<A, E>,
  config?: Partial<RecoveryConfig>,
) {
  const cfg = { ...DefaultRecovery, ...config }
  const loop = (state: RetryState): Effect.Effect<A, E> =>
    execute(state).pipe(
      Effect.catchIf(() => true, (error) => {
        if (state.attempts >= cfg.maxRetries) {
          return Effect.fail(error)
        }
        const delay = state.fallbackModelUsed ? cfg.retryDelayMs * 2 : cfg.retryDelayMs
        return Effect.sleep(delay).pipe(
          Effect.andThen(loop({
            attempts: state.attempts + 1,
            lastError: String(error),
            fallbackModelUsed: state.attempts >= 1 && cfg.fallbackModelStrategy !== "none",
            fallbackProviderUsed: state.attempts >= 2 && cfg.fallbackProviderStrategy !== "none",
            fallbackSpecialistUsed: state.attempts >= 3 && cfg.allowSpecialistFallback,
            strategyChanged: state.attempts >= 2 && cfg.allowStrategyChange,
          })),
        )
      }),
    )
  return loop({
    attempts: 0, lastError: undefined,
    fallbackModelUsed: false, fallbackProviderUsed: false,
    fallbackSpecialistUsed: false, strategyChanged: false,
  })
}

const fallback: Interface["fallback"] = function <A, E>(
  primary: Effect.Effect<A, E>,
  fallbackEffect: Effect.Effect<A, E>,
) {
  return primary.pipe(
    Effect.catchIf(() => true, () => fallbackEffect),
  )
}

const withTimeout: Interface["withTimeout"] = function <A, E>(
  effect: Effect.Effect<A, E>,
  timeoutMs: number,
) {
  return effect.pipe(
    Effect.timeout(timeoutMs),
    Effect.catchIf(() => true, () => effect),
  ) as Effect.Effect<A, E>
}

const cancel: Interface["cancel"] = function <A, E>(effect: Effect.Effect<A, E>) {
  return effect.pipe(
    Effect.timeout(100),
    Effect.catchIf(() => true, () => Effect.succeed(undefined as unknown as A)),
  ) as Effect.Effect<A, E>
}

function planFallback(state: RetryState, config?: Partial<RecoveryConfig>): FallbackPlan {
  const cfg = { ...DefaultRecovery, ...config }
  return {
    useFallbackModel: state.attempts >= 2 && cfg.fallbackModelStrategy !== "none",
    useFallbackProvider: state.attempts >= 3 && cfg.fallbackProviderStrategy !== "none",
    useFallbackSpecialist: state.attempts >= 4 && cfg.allowSpecialistFallback,
    changeStrategy: state.attempts >= 3 && cfg.allowStrategyChange,
    reason: `recovering after ${state.attempts} attempt(s): ${state.lastError ?? "unknown error"}`,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ attempt, fallback, withTimeout, planFallback, cancel })
  }),
)

export { layer }
