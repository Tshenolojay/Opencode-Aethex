export * as DomainIntelligence from "./domain-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile, type BusinessDomain } from "./application-profile"

export interface DomainTerm {
  readonly term: string
  readonly definition: string
  readonly domain: BusinessDomain
}

export interface DomainPattern {
  readonly name: string
  readonly description: string
  readonly domain: BusinessDomain
}

export interface DomainAnalysis {
  readonly domain: BusinessDomain
  readonly terminology: readonly DomainTerm[]
  readonly patterns: readonly DomainPattern[]
  readonly complianceRequirements: readonly string[]
  readonly industryPatterns: readonly string[]
  readonly operationalRules: readonly string[]
  readonly businessObjectives: readonly string[]
  readonly kpis: readonly string[]
  readonly commonWorkflows: readonly string[]
}

const DOMAIN_TERMS: Partial<Record<BusinessDomain, readonly DomainTerm[]>> = {
  "software-development": [
    { term: "repository", definition: "Source code storage and version control", domain: "software-development" },
    { term: "deployment", definition: "Release of software to production environments", domain: "software-development" },
    { term: "pipeline", definition: "Automated build-test-deploy workflow", domain: "software-development" },
  ],
  commerce: [
    { term: "SKU", definition: "Stock keeping unit — unique product identifier", domain: "commerce" },
    { term: "cart", definition: "Collection of items selected for purchase", domain: "commerce" },
    { term: "checkout", definition: "Process of completing a purchase transaction", domain: "commerce" },
  ],
  crm: [
    { term: "lead", definition: "Potential customer identified through marketing", domain: "crm" },
    { term: "opportunity", definition: "Qualified sales prospect with potential to convert", domain: "crm" },
    { term: "pipeline", definition: "Stages of customer acquisition process", domain: "crm" },
  ],
  erp: [
    { term: "ERP", definition: "Enterprise Resource Planning system", domain: "erp" },
    { term: "MRP", definition: "Material Requirements Planning", domain: "erp" },
    { term: "GL", definition: "General Ledger — core accounting record", domain: "erp" },
  ],
  analytics: [
    { term: "metric", definition: "Quantifiable measure of performance", domain: "analytics" },
    { term: "dashboard", definition: "Visual display of key metrics and data", domain: "analytics" },
    { term: "report", definition: "Structured presentation of data insights", domain: "analytics" },
  ],
  automation: [
    { term: "trigger", definition: "Event that initiates an automated workflow", domain: "automation" },
    { term: "action", definition: "Step executed as part of an automation", domain: "automation" },
    { term: "workflow", definition: "Sequence of automated steps", domain: "automation" },
  ],
  communication: [
    { term: "channel", definition: "Medium for message delivery", domain: "communication" },
    { term: "thread", definition: "Sequential conversation on a topic", domain: "communication" },
    { term: "notification", definition: "Alert sent to a user or system", domain: "communication" },
  ],
  research: [
    { term: "hypothesis", definition: "Proposed explanation to be tested", domain: "research" },
    { term: "finding", definition: "Result or conclusion from research", domain: "research" },
    { term: "source", definition: "Origin of information or data", domain: "research" },
  ],
  marketing: [
    { term: "campaign", definition: "Coordinated marketing initiative", domain: "marketing" },
    { term: "segment", definition: "Group of customers with shared characteristics", domain: "marketing" },
    { term: "conversion", definition: "Completed desired action by a prospect", domain: "marketing" },
  ],
  scheduling: [
    { term: "event", definition: "Calendar entry with time and participants", domain: "scheduling" },
    { term: "availability", definition: "Times when a resource is free", domain: "scheduling" },
    { term: "booking", definition: "Confirmed reservation of a time slot", domain: "scheduling" },
  ],
  "document-management": [
    { term: "document", definition: "Structured collection of information", domain: "document-management" },
    { term: "version", definition: "Specific revision of a document", domain: "document-management" },
    { term: "approval", definition: "Formal sign-off on a document", domain: "document-management" },
  ],
  general: [
    { term: "entity", definition: "Core business object or record", domain: "general" },
    { term: "workflow", definition: "Sequence of steps to accomplish a task", domain: "general" },
    { term: "integration", definition: "Connection between different systems", domain: "general" },
  ],
}

export interface Interface {
  readonly analyze: () => Effect.Effect<DomainAnalysis>
  readonly getTerminology: () => Effect.Effect<readonly DomainTerm[]>
  readonly getDomain: () => Effect.Effect<BusinessDomain | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DomainIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service

    const analyze: Interface["analyze"] = Effect.fn("DomainIntelligence.analyze")(function* () {
      const profile = yield* appProfile.get()
      const domain = profile?.businessDomain ?? "general"
      const terms = DOMAIN_TERMS[domain] ?? (DOMAIN_TERMS.general ?? [])

      return {
        domain,
        terminology: terms,
        patterns: [{ name: `${domain}-patterns`, description: `Common patterns for ${domain}`, domain }],
        complianceRequirements: [],
        industryPatterns: [],
        operationalRules: [`Standard ${domain} operational rules apply`],
        businessObjectives: [`Improve ${domain} outcomes`],
        kpis: [`${domain}-specific KPIs`],
        commonWorkflows: profile?.supportedWorkflows ?? [],
      }
    })

    const getTerminology: Interface["getTerminology"] = Effect.fn("DomainIntelligence.getTerminology")(function* () {
      const result = yield* analyze()
      return result.terminology
    })

    return Service.of({
      analyze,
      getTerminology,
      getDomain: () => appProfile.getBusinessDomain(),
    })
  }),
)

export { layer }
