export * as ApplicationDiscovery from "./application-discovery"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile, type ApplicationModule, type ApplicationType, type BusinessDomain } from "./application-profile"

export interface DiscoveryResult {
  readonly detectedType: ApplicationType
  readonly detectedDomain: BusinessDomain
  readonly detectedModules: readonly ApplicationModule[]
  readonly detectedCapabilities: readonly string[]
  readonly detectedWorkflows: readonly string[]
  readonly detectedServices: readonly string[]
  readonly timestamp: number
}

export interface Interface {
  readonly discover: () => Effect.Effect<DiscoveryResult>
  readonly scanModules: () => Effect.Effect<readonly ApplicationModule[]>
  readonly inferDomain: () => Effect.Effect<BusinessDomain>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationDiscovery") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service

    const inferDomain: Interface["inferDomain"] = Effect.fn("ApplicationDiscovery.inferDomain")(function* () {
      const profile = yield* appProfile.get()
      return profile?.businessDomain ?? "general"
    })

    const scanModules: Interface["scanModules"] = Effect.fn("ApplicationDiscovery.scanModules")(function* () {
      const profile = yield* appProfile.get()
      return profile?.modules ?? []
    })

    const discover: Interface["discover"] = Effect.fn("ApplicationDiscovery.discover")(function* () {
      const profile = yield* appProfile.get()
      return {
        detectedType: profile?.applicationType ?? "unknown",
        detectedDomain: profile?.businessDomain ?? "general",
        detectedModules: profile?.modules ?? [],
        detectedCapabilities: profile?.capabilities ?? [],
        detectedWorkflows: profile?.supportedWorkflows ?? [],
        detectedServices: [],
        timestamp: Date.now(),
      }
    })

    return Service.of({ discover, scanModules, inferDomain })
  }),
)

export { layer }
