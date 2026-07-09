export * as ApplicationProfile from "./application-profile"

import { Context, Effect, Layer, Ref } from "effect"

export type ApplicationType = "web" | "desktop" | "mobile" | "cli" | "service" | "library" | "platform" | "unknown"
export type BusinessDomain = "software-development" | "commerce" | "crm" | "erp" | "analytics" | "automation" | "communication" | "research" | "marketing" | "scheduling" | "document-management" | "general"

export interface ApplicationModule {
  readonly name: string
  readonly description: string
  readonly version: string | undefined
  readonly enabled: boolean
  readonly capabilities: readonly string[]
}

export interface ApplicationPermission {
  readonly resource: string
  readonly actions: readonly string[]
}

export interface ApplicationProfile {
  readonly name: string
  readonly version: string | undefined
  readonly applicationType: ApplicationType
  readonly businessDomain: BusinessDomain
  readonly description: string
  readonly modules: readonly ApplicationModule[]
  readonly supportedWorkflows: readonly string[]
  readonly capabilities: readonly string[]
  readonly permissions: readonly ApplicationPermission[]
  readonly executionBoundaries: readonly string[]
}

export interface Interface {
  readonly register: (profile: ApplicationProfile) => Effect.Effect<void>
  readonly get: () => Effect.Effect<ApplicationProfile | undefined>
  readonly update: (profile: ApplicationProfile) => Effect.Effect<void>
  readonly getApplicationType: () => Effect.Effect<ApplicationType | undefined>
  readonly getBusinessDomain: () => Effect.Effect<BusinessDomain | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationProfile") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const current = yield* Ref.make<ApplicationProfile | undefined>(undefined)

    return Service.of({
      register: Effect.fn("ApplicationProfile.register")(function* (profile) {
        yield* Ref.set(current, profile)
      }),
      get: Effect.fn("ApplicationProfile.get")(function* () {
        return yield* Ref.get(current)
      }),
      update: Effect.fn("ApplicationProfile.update")(function* (profile) {
        yield* Ref.set(current, profile)
      }),
      getApplicationType: Effect.fn("ApplicationProfile.getApplicationType")(function* () {
        const p = yield* Ref.get(current)
        return p?.applicationType
      }),
      getBusinessDomain: Effect.fn("ApplicationProfile.getBusinessDomain")(function* () {
        const p = yield* Ref.get(current)
        return p?.businessDomain
      }),
    })
  }),
)

export { layer }
