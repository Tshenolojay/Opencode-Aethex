export * as ModuleIntelligence from "./module-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile, type ApplicationModule } from "./application-profile"
import { ApplicationAnalyzer } from "./application-analyzer"

export type DependencyType = "imports" | "configures" | "communicates-with" | "depends-on" | "extends"

export interface ModuleDependency {
  readonly source: string
  readonly target: string
  readonly type: DependencyType
}

export interface ModuleMetrics {
  readonly coupling: number
  readonly cohesion: number
  readonly complexity: number
}

export interface ModuleAnalysis {
  readonly modules: readonly ApplicationModule[]
  readonly dependencies: readonly ModuleDependency[]
  readonly metrics: Readonly<Record<string, ModuleMetrics>>
  readonly sharedServices: readonly string[]
  readonly reusableComponents: readonly string[]
  readonly recommendations: readonly string[]
}

export interface Interface {
  readonly analyze: () => Effect.Effect<ModuleAnalysis>
  readonly getDependencies: () => Effect.Effect<readonly ModuleDependency[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModuleIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service
    const analyzer = yield* ApplicationAnalyzer.Service

    const analyze: Interface["analyze"] = Effect.fn("ModuleIntelligence.analyze")(function* () {
      const profile = yield* appProfile.get()
      const relationships = yield* analyzer.getModuleRelationships()

      const modules = profile?.modules ?? []
      const dependencies: ModuleDependency[] = relationships.map((r) => ({
        source: r.source,
        target: r.target,
        type: r.relationshipType,
      }))

      const metrics: Record<string, ModuleMetrics> = {}
      for (const m of modules) {
        const incoming = dependencies.filter((d) => d.target === m.name).length
        const outgoing = dependencies.filter((d) => d.source === m.name).length
        metrics[m.name] = {
          coupling: incoming + outgoing,
          cohesion: m.capabilities.length > 0 ? Math.min(1, m.capabilities.length / 5) : 0.1,
          complexity: (incoming + outgoing + m.capabilities.length) / 10,
        }
      }

      return {
        modules,
        dependencies,
        metrics,
        sharedServices: modules.filter((m) => m.capabilities.length > 2).map((m) => m.name),
        reusableComponents: modules.filter((m) => m.enabled).map((m) => m.name),
        recommendations: [],
      }
    })

    return Service.of({
      analyze,
      getDependencies: Effect.fn("ModuleIntelligence.getDependencies")(function* () {
        const result = yield* analyze()
        return result.dependencies
      }),
    })
  }),
)

export { layer }
