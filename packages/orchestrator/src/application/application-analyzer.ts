export * as ApplicationAnalyzer from "./application-analyzer"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile } from "./application-profile"

export interface ArchitectureInsight {
  readonly pattern: string
  readonly description: string
  readonly confidence: number
}

export interface BusinessLogicInsight {
  readonly domain: string
  readonly processes: readonly string[]
  readonly complexity: number
}

export interface ModuleRelationship {
  readonly source: string
  readonly target: string
  readonly relationshipType: "depends-on" | "imports" | "extends" | "configures" | "communicates-with"
}

export interface IntegrationPoint {
  readonly name: string
  readonly type: "api" | "webhook" | "database" | "message-queue" | "file-system" | "custom"
  readonly direction: "inbound" | "outbound" | "bidirectional"
}

export interface AnalysisResult {
  readonly architecture: readonly ArchitectureInsight[]
  readonly businessLogic: readonly BusinessLogicInsight[]
  readonly moduleRelationships: readonly ModuleRelationship[]
  readonly integrationPoints: readonly IntegrationPoint[]
  readonly workflowCount: number
  readonly capabilityCount: number
  readonly timestamp: number
}

export interface Interface {
  readonly analyze: () => Effect.Effect<AnalysisResult>
  readonly getArchitectureInsights: () => Effect.Effect<readonly ArchitectureInsight[]>
  readonly getModuleRelationships: () => Effect.Effect<readonly ModuleRelationship[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationAnalyzer") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service

    const analyze: Interface["analyze"] = Effect.fn("ApplicationAnalyzer.analyze")(function* () {
      const profile = yield* appProfile.get()

      const architecture: ArchitectureInsight[] = [
        { pattern: profile?.applicationType ?? "unknown", description: `Application type: ${profile?.applicationType ?? "unknown"}`, confidence: 0.8 },
        { pattern: "modular", description: `${profile?.modules.length ?? 0} registered modules`, confidence: 0.9 },
      ]

      const businessLogic: BusinessLogicInsight[] = [{
        domain: profile?.businessDomain ?? "general",
        processes: profile?.supportedWorkflows ?? [],
        complexity: (profile?.modules.length ?? 0) > 5 ? 0.8 : (profile?.modules.length ?? 0) > 2 ? 0.5 : 0.2,
      }]

      const moduleRelationships: ModuleRelationship[] = (profile?.modules ?? []).flatMap((m, i) =>
        i > 0 ? [{ source: m.name, target: profile!.modules[i - 1]!.name, relationshipType: "depends-on" as const }] : [],
      )

      const integrationPoints: IntegrationPoint[] = (profile?.executionBoundaries ?? []).map((b) => ({
        name: b, type: "custom" as const, direction: "bidirectional" as const,
      }))

      return {
        architecture,
        businessLogic,
        moduleRelationships,
        integrationPoints,
        workflowCount: profile?.supportedWorkflows.length ?? 0,
        capabilityCount: profile?.capabilities.length ?? 0,
        timestamp: Date.now(),
      }
    })

    const getArchitectureInsights: Interface["getArchitectureInsights"] = Effect.fn("ApplicationAnalyzer.getArchitectureInsights")(function* () {
      const result = yield* analyze()
      return result.architecture
    })

    const getModuleRelationships: Interface["getModuleRelationships"] = Effect.fn("ApplicationAnalyzer.getModuleRelationships")(function* () {
      const result = yield* analyze()
      return result.moduleRelationships
    })

    return Service.of({ analyze, getArchitectureInsights, getModuleRelationships })
  }),
)

export { layer }
