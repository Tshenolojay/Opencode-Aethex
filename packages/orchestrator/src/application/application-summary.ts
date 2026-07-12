export * as ApplicationSummaryEngine from "./application-summary"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile } from "./application-profile"
import { ApplicationIntelligence, type IntelligenceReport } from "./application-intelligence"
import { DomainIntelligence } from "./domain-intelligence"
import { BusinessIntelligence } from "./business-intelligence"
import { WorkflowIntelligence } from "./workflow-intelligence"
import { FeatureIntelligence } from "./feature-intelligence"
import { ModuleIntelligence } from "./module-intelligence"
import { ServiceIntelligence } from "./service-intelligence"
import { IntegrationIntelligence } from "./integration-intelligence"
import { OrganizationIntelligence } from "./organization-intelligence"

export interface ExecutiveSummary {
  readonly application: string
  readonly version: string | undefined
  readonly type: string
  readonly domain: string
  readonly moduleCount: number
  readonly workflowCount: number
  readonly serviceCount: number
  readonly featureCount: number
}

export interface Strengths {
  readonly items: readonly string[]
}

export interface Weaknesses {
  readonly items: readonly string[]
}

export interface Opportunities {
  readonly items: readonly string[]
}

export interface Recommendations {
  readonly items: readonly string[]
}

export interface ComprehensiveSummary {
  readonly executive: ExecutiveSummary
  readonly architecture: string
  readonly business: string
  readonly workflows: string
  readonly features: string
  readonly integrations: string
  readonly strengths: Strengths
  readonly weaknesses: Weaknesses
  readonly opportunities: Opportunities
  readonly recommendations: Recommendations
  readonly timestamp: number
}

export interface Interface {
  readonly generate: () => Effect.Effect<ComprehensiveSummary>
  readonly getExecutiveSummary: () => Effect.Effect<ExecutiveSummary>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationSummary") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service
    const appIntelligence = yield* ApplicationIntelligence.Service
    const domainIntel = yield* DomainIntelligence.Service
    const businessIntel = yield* BusinessIntelligence.Service
    const workflowIntel = yield* WorkflowIntelligence.Service
    const featureIntel = yield* FeatureIntelligence.Service
    const moduleIntel = yield* ModuleIntelligence.Service
    const serviceIntel = yield* ServiceIntelligence.Service
    const integrationIntel = yield* IntegrationIntelligence.Service
    const orgIntel = yield* OrganizationIntelligence.Service

    const generate: Interface["generate"] = Effect.fn("ApplicationSummary.generate")(function* () {
      const profile = yield* appProfile.get()
      const report = yield* appIntelligence.generateReport()
      const domain = yield* domainIntel.analyze()
      const business = yield* businessIntel.analyze()
      const workflows = yield* workflowIntel.analyze()
      const features = yield* featureIntel.buildCatalog()
      const modules = yield* moduleIntel.analyze()
      const services = yield* serviceIntel.analyze()
      const integrations = yield* integrationIntel.analyze()
      const org = yield* orgIntel.analyze()

      const executive: ExecutiveSummary = {
        application: profile?.name ?? "unknown",
        version: profile?.version,
        type: profile?.applicationType ?? "unknown",
        domain: profile?.businessDomain ?? "general",
        moduleCount: modules.modules.length,
        workflowCount: workflows.workflows.length,
        serviceCount: services.services.length,
        featureCount: features.totalFeatures,
      }

      return {
        executive,
        architecture: `${modules.modules.length} modules, ${modules.dependencies.length} dependencies`,
        business: `${business.departments.length} departments, ${business.processes.length} processes`,
        workflows: `${workflows.workflows.length} workflows, ${workflows.optimizations.length} optimizations`,
        features: `${features.totalFeatures} features, ${features.duplicateCapabilities.length} duplicates`,
        integrations: `${integrations.connectors.length} connectors, ${integrations.externalAPIs.length} external APIs`,
        strengths: { items: [`Modular design with ${modules.modules.length} modules`] },
        weaknesses: { items: features.duplicateCapabilities.length > 0 ? [`Duplicate capabilities detected`] : [] },
        opportunities: { items: workflows.optimizations.map((o) => o.suggestion) },
        recommendations: { items: integrations.recommendations.length > 0 ? integrations.recommendations : [`Maintain current architecture`] },
        timestamp: Date.now(),
      }
    })

    return Service.of({
      generate,
      getExecutiveSummary: Effect.fn("ApplicationSummary.getExecutiveSummary")(function* () {
        const summary = yield* generate()
        return summary.executive
      }),
    })
  }),
)

export { layer }
