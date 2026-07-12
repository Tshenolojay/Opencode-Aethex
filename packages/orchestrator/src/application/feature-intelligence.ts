export * as FeatureIntelligence from "./feature-intelligence"

import { Context, Effect, Layer, Ref } from "effect"
import { ApplicationProfile } from "./application-profile"

export interface FeatureDefinition {
  readonly name: string
  readonly description: string
  readonly module: string
  readonly maturity: "planned" | "active" | "deprecated"
  readonly owner: string | undefined
  readonly dependsOn: readonly string[]
  readonly capabilities: readonly string[]
}

export interface FeatureCatalog {
  readonly features: readonly FeatureDefinition[]
  readonly totalFeatures: number
  readonly duplicateCapabilities: readonly string[]
  readonly missingCapabilities: readonly string[]
  readonly enhancementOpportunities: readonly string[]
}

export interface Interface {
  readonly buildCatalog: () => Effect.Effect<FeatureCatalog>
  readonly registerFeature: (feature: FeatureDefinition) => Effect.Effect<void>
  readonly getFeaturesByModule: (module: string) => Effect.Effect<readonly FeatureDefinition[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/FeatureIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service
    const customFeatures = yield* Ref.make<FeatureDefinition[]>([])

    const buildCatalog: Interface["buildCatalog"] = Effect.fn("FeatureIntelligence.buildCatalog")(function* () {
      const profile = yield* appProfile.get()
      const custom = yield* Ref.get(customFeatures)

      const moduleFeatures: FeatureDefinition[] = (profile?.modules ?? []).map((m) => ({
        name: `${m.name}-feature`,
        description: `Core feature for ${m.name}`,
        module: m.name,
        maturity: m.enabled ? "active" as const : "planned" as const,
        owner: undefined,
        dependsOn: [],
        capabilities: m.capabilities,
      }))

      const all = [...moduleFeatures, ...custom]
      const capabilityNames = all.flatMap((f) => f.capabilities)
      const seen = new Map<string, number>()
      for (const c of capabilityNames) seen.set(c, (seen.get(c) ?? 0) + 1)
      const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([name]) => name)

      return {
        features: all,
        totalFeatures: all.length,
        duplicateCapabilities: duplicates,
        missingCapabilities: [],
        enhancementOpportunities: all
          .filter((f) => f.maturity === "planned")
          .map((f) => `Activate ${f.name}`),
      }
    })

    return Service.of({
      buildCatalog,
      registerFeature: Effect.fn("FeatureIntelligence.registerFeature")(function* (feature) {
        yield* Ref.update(customFeatures, (f) => [...f, feature])
      }),
      getFeaturesByModule: Effect.fn("FeatureIntelligence.getFeaturesByModule")(function* (module) {
        const catalog = yield* buildCatalog()
        return catalog.features.filter((f) => f.module === module)
      }),
    })
  }),
)

export { layer }
