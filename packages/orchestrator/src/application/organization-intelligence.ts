export * as OrganizationIntelligence from "./organization-intelligence"

import { Context, Effect, Layer } from "effect"

export interface Department {
  readonly name: string
  readonly description: string
  readonly head: string | undefined
  readonly responsibilities: readonly string[]
}

export interface OrganizationalHierarchy {
  readonly departments: readonly Department[]
  readonly reportingStructure: readonly { readonly manager: string; readonly report: string }[]
  readonly approvalChains: readonly { readonly process: string; readonly chain: readonly string[] }[]
}

export interface OrganizationAnalysis {
  readonly departments: readonly Department[]
  readonly hierarchy: OrganizationalHierarchy
  readonly employeeResponsibilities: readonly string[]
  readonly operationalOwnership: Readonly<Record<string, string>>
  readonly collaborationFlows: readonly string[]
}

const BUILT_IN_DEPARTMENTS: readonly Department[] = [
  { name: "engineering", description: "Software development and infrastructure", head: undefined, responsibilities: ["development", "deployment", "maintenance"] },
  { name: "operations", description: "Business operations and logistics", head: undefined, responsibilities: ["process-management", "fulfillment"] },
  { name: "marketing", description: "Marketing and brand management", head: undefined, responsibilities: ["campaigns", "brand", "analytics"] },
  { name: "sales", description: "Customer acquisition and revenue", head: undefined, responsibilities: ["sales", "account-management"] },
  { name: "finance", description: "Financial management and reporting", head: undefined, responsibilities: ["accounting", "budgeting", "reporting"] },
  { name: "hr", description: "Human resources and personnel", head: undefined, responsibilities: ["hiring", "payroll", "performance"] },
  { name: "support", description: "Customer support and success", head: undefined, responsibilities: ["ticketing", "resolution", "feedback"] },
]

export interface Interface {
  readonly analyze: () => Effect.Effect<OrganizationAnalysis>
  readonly getDepartments: () => Effect.Effect<readonly Department[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/OrganizationIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const analyze: Interface["analyze"] = Effect.fn("OrganizationIntelligence.analyze")(function* () {
      const departments = BUILT_IN_DEPARTMENTS

      return {
        departments,
        hierarchy: {
          departments,
          reportingStructure: [
            { manager: "executive", report: "engineering" },
            { manager: "executive", report: "operations" },
            { manager: "executive", report: "marketing" },
            { manager: "executive", report: "sales" },
            { manager: "executive", report: "finance" },
            { manager: "executive", report: "hr" },
            { manager: "executive", report: "support" },
          ],
          approvalChains: [
            { process: "budget", chain: ["manager", "director", "executive"] },
            { process: "hiring", chain: ["manager", "hr", "executive"] },
            { process: "deployment", chain: ["engineer", "lead", "manager"] },
          ],
        },
        employeeResponsibilities: departments.flatMap((d) => d.responsibilities),
        operationalOwnership: Object.fromEntries(departments.map((d) => [d.name, d.description])),
        collaborationFlows: departments.map((d) => `${d.name}-collaboration`),
      }
    })

    return Service.of({
      analyze,
      getDepartments: Effect.fn("OrganizationIntelligence.getDepartments")(function* () {
        const result = yield* analyze()
        return result.departments
      }),
    })
  }),
)

export { layer }
