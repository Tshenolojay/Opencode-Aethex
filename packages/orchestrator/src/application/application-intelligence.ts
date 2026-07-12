export * as ApplicationIntelligence from "./application-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile, type ApplicationModule } from "./application-profile"
import { ApplicationAnalyzer, type AnalysisResult } from "./application-analyzer"
import { ApplicationCapabilities, type CapabilityDefinition } from "./application-capabilities"
import { ApplicationWorkflows, type BusinessWorkflow } from "./application-workflows"
import { ApplicationServices, type ApplicationService } from "./application-services"
import { ApplicationDiscovery } from "./application-discovery"

export interface ApplicationSummary {
  readonly name: string
  readonly version: string | undefined
  readonly applicationType: string
  readonly businessDomain: string
  readonly moduleCount: number
  readonly capabilityCount: number
  readonly workflowCount: number
  readonly serviceCount: number
}

export interface BusinessSummary {
  readonly domain: string
  readonly primaryProcesses: readonly string[]
  readonly complexity: number
  readonly integrationPoints: readonly string[]
}

export interface WorkflowCatalog {
  readonly workflows: readonly BusinessWorkflow[]
  readonly categories: readonly string[]
  readonly totalWorkflows: number
}

export interface CapabilityCatalog {
  readonly capabilities: readonly CapabilityDefinition[]
  readonly categories: readonly string[]
  readonly totalCapabilities: number
}

export interface ServiceCatalog {
  readonly services: readonly ApplicationService[]
  readonly totalServices: number
}

export interface ModuleCatalog {
  readonly modules: readonly ApplicationModule[]
  readonly totalModules: number
}

export interface IntelligenceReport {
  readonly application: ApplicationSummary
  readonly business: BusinessSummary
  readonly workflows: WorkflowCatalog
  readonly capabilities: CapabilityCatalog
  readonly services: ServiceCatalog
  readonly modules: ModuleCatalog
  readonly analysis: AnalysisResult | undefined
  readonly timestamp: number
}

export interface Interface {
  readonly generateReport: () => Effect.Effect<IntelligenceReport>
  readonly getApplicationSummary: () => Effect.Effect<ApplicationSummary>
  readonly getBusinessSummary: () => Effect.Effect<BusinessSummary>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.succeed({
    generateReport: Effect.fn("ApplicationIntelligence.generateReport")(function* () {
      const appProfile = yield* ApplicationProfile.Service
      const analyzer = yield* ApplicationAnalyzer.Service
      const appCaps = yield* ApplicationCapabilities.Service
      const workflows = yield* ApplicationWorkflows.Service
      const servicesService = yield* ApplicationServices.Service

      const profile = yield* appProfile.get()
      const analysis = yield* analyzer.analyze()
      const caps = yield* appCaps.getAvailableCapabilities()
      const wfs = yield* workflows.getWorkflows()
      const svcs = yield* servicesService.getAll()

      const app: ApplicationSummary = {
        name: profile?.name ?? "unknown",
        version: profile?.version,
        applicationType: profile?.applicationType ?? "unknown",
        businessDomain: profile?.businessDomain ?? "general",
        moduleCount: profile?.modules.length ?? 0,
        capabilityCount: profile?.capabilities.length ?? 0,
        workflowCount: profile?.supportedWorkflows.length ?? 0,
        serviceCount: svcs.length,
      }

      const business: BusinessSummary = {
        domain: profile?.businessDomain ?? "general",
        primaryProcesses: profile?.supportedWorkflows ?? [],
        complexity: analysis.businessLogic.reduce((max, b) => Math.max(max, b.complexity), 0),
        integrationPoints: analysis.integrationPoints.map((ip) => ip.name),
      }

      const catSet = new Set<string>()
      for (const c of caps) catSet.add(c.category)
      const workflowCatSet = new Set<string>()
      for (const w of wfs) workflowCatSet.add(w.category)

      return {
        application: app,
        business,
        workflows: { workflows: wfs, categories: Array.from(workflowCatSet), totalWorkflows: wfs.length },
        capabilities: { capabilities: caps, categories: Array.from(catSet), totalCapabilities: caps.length },
        services: { services: svcs, totalServices: svcs.length },
        modules: { modules: profile?.modules ?? [], totalModules: profile?.modules.length ?? 0 },
        analysis,
        timestamp: Date.now(),
      }
    }),

    getApplicationSummary: Effect.fn("ApplicationIntelligence.getApplicationSummary")(function* () {
      const appProfile = yield* ApplicationProfile.Service
      const analyzer = yield* ApplicationAnalyzer.Service
      const appCaps = yield* ApplicationCapabilities.Service
      const workflows = yield* ApplicationWorkflows.Service
      const servicesService = yield* ApplicationServices.Service

      const profile = yield* appProfile.get()
      const analysis = yield* analyzer.analyze()
      const caps = yield* appCaps.getAvailableCapabilities()
      const wfs = yield* workflows.getWorkflows()
      const svcs = yield* servicesService.getAll()

      return {
        name: profile?.name ?? "unknown",
        version: profile?.version,
        applicationType: profile?.applicationType ?? "unknown",
        businessDomain: profile?.businessDomain ?? "general",
        moduleCount: profile?.modules.length ?? 0,
        capabilityCount: profile?.capabilities.length ?? 0,
        workflowCount: profile?.supportedWorkflows.length ?? 0,
        serviceCount: svcs.length,
      }
    }),

    getBusinessSummary: Effect.fn("ApplicationIntelligence.getBusinessSummary")(function* () {
      const appProfile = yield* ApplicationProfile.Service
      const analyzer = yield* ApplicationAnalyzer.Service

      const profile = yield* appProfile.get()
      const analysis = yield* analyzer.analyze()

      return {
        domain: profile?.businessDomain ?? "general",
        primaryProcesses: profile?.supportedWorkflows ?? [],
        complexity: analysis.businessLogic.reduce((max, b) => Math.max(max, b.complexity), 0),
        integrationPoints: analysis.integrationPoints.map((ip) => ip.name),
      }
    }),
  }) as unknown as Effect.Effect<Interface, never, never>,
)

export { layer }
