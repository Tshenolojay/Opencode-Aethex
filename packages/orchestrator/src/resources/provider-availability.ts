export * as ProviderAvailability from "./provider-availability"

import { Context, Effect, Layer } from "effect"
import type { ProviderHealthState } from "./provider-health"

export type AvailabilityStatus =
  | "available"
  | "temporarily-unavailable"
  | "disabled"
  | "maintenance"
  | "quota-exhausted"
  | "rate-limited"
  | "unsupported"
  | "offline"

export interface ProviderAvailabilityInfo {
  readonly providerID: string
  readonly status: AvailabilityStatus
  readonly reason: string
  readonly retryAfterMs: number | undefined
  readonly lastChecked: number
}

export interface Interface {
  readonly check: (providerID: string, health: ProviderHealthState | undefined) => Effect.Effect<ProviderAvailabilityInfo>
  readonly isAvailable: (providerID: string, health: ProviderHealthState | undefined) => Effect.Effect<boolean>
  readonly filterAvailable: (providers: readonly { providerID: string }[], healths: ReadonlyMap<string, ProviderHealthState>) => Effect.Effect<readonly string[]>
}

const make = Effect.gen(function* () {
  const check = (providerID: string, health: ProviderHealthState | undefined): Effect.Effect<ProviderAvailabilityInfo> =>
    Effect.sync(() => {
      if (!health) {
        return {
          providerID,
          status: "available" as AvailabilityStatus,
          reason: "No health data — treating as available",
          retryAfterMs: undefined,
          lastChecked: Date.now(),
        }
      }

      if (!health.available) {
        return {
          providerID,
          status: "temporarily-unavailable" as AvailabilityStatus,
          reason: `${health.consecutiveFailures} consecutive failures`,
          retryAfterMs: health.consecutiveFailures >= 5 ? 60_000 : 30_000,
          lastChecked: Date.now(),
        }
      }

      if (health.rateLimitRemaining !== undefined && health.rateLimitRemaining <= 0) {
        return {
          providerID,
          status: "rate-limited" as AvailabilityStatus,
          reason: "Rate limit exhausted",
          retryAfterMs: 60_000,
          lastChecked: Date.now(),
        }
      }

      if (health.quotaRemaining !== undefined && health.quotaRemaining <= 0) {
        return {
          providerID,
          status: "quota-exhausted" as AvailabilityStatus,
          reason: "API quota exhausted",
          retryAfterMs: undefined,
          lastChecked: Date.now(),
        }
      }

      if (health.healthScore < 0.2) {
        return {
          providerID,
          status: "maintenance" as AvailabilityStatus,
          reason: `Health score critically low: ${health.healthScore.toFixed(2)}`,
          retryAfterMs: 120_000,
          lastChecked: Date.now(),
        }
      }

      return {
        providerID,
        status: "available" as AvailabilityStatus,
        reason: "Healthy",
        retryAfterMs: undefined,
        lastChecked: Date.now(),
      }
    })

  const isAvailable = (providerID: string, health: ProviderHealthState | undefined) =>
    Effect.map(check(providerID, health), (info) => info.status === "available")

  const filterAvailable = (
    providers: readonly { providerID: string }[],
    healths: ReadonlyMap<string, ProviderHealthState>,
  ) =>
    Effect.filter(providers, (p) => isAvailable(p.providerID, healths.get(p.providerID))).pipe(
      Effect.map((results) => results.map((p) => p.providerID)),
    )

  return Service.of({ check, isAvailable, filterAvailable })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ProviderAvailability") {}

const layer = Layer.effect(Service, make)
export { layer }
