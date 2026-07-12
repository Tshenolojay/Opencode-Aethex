export * as BusinessIntelligence from "./business-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationProfile } from "./application-profile"

export interface BusinessProcess {
  readonly name: string
  readonly description: string
  readonly department: string
  readonly approvalRequired: boolean
  readonly automationPotential: number
  readonly criticality: "low" | "medium" | "high"
}

export interface BusinessAnalysis {
  readonly departments: readonly string[]
  readonly processes: readonly BusinessProcess[]
  readonly approvalChains: readonly string[]
  readonly reportingRequirements: readonly string[]
  readonly customerLifecycle: readonly string[]
  readonly employeeWorkflows: readonly string[]
}

const BUILT_IN_PROCESSES: readonly BusinessProcess[] = [
  { name: "Customer Onboarding", description: "Register and set up new customers", department: "operations", approvalRequired: false, automationPotential: 0.8, criticality: "high" },
  { name: "Order Fulfillment", description: "Process and ship customer orders", department: "operations", approvalRequired: false, automationPotential: 0.7, criticality: "high" },
  { name: "Invoice Processing", description: "Generate and send invoices", department: "finance", approvalRequired: true, automationPotential: 0.9, criticality: "medium" },
  { name: "Employee Timesheets", description: "Track and approve employee time", department: "hr", approvalRequired: true, automationPotential: 0.6, criticality: "medium" },
  { name: "Marketing Campaign", description: "Plan and execute marketing campaigns", department: "marketing", approvalRequired: true, automationPotential: 0.5, criticality: "medium" },
]

export interface Interface {
  readonly analyze: () => Effect.Effect<BusinessAnalysis>
  readonly getProcesses: () => Effect.Effect<readonly BusinessProcess[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/BusinessIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const appProfile = yield* ApplicationProfile.Service

    const analyze: Interface["analyze"] = Effect.fn("BusinessIntelligence.analyze")(function* () {
      const profile = yield* appProfile.get()
      const departments = ["operations", "finance", "marketing", "hr", "engineering", "sales", "support"]

      return {
        departments,
        processes: BUILT_IN_PROCESSES,
        approvalChains: ["manager-approval", "director-approval", "executive-approval"],
        reportingRequirements: ["monthly-summary", "quarterly-review", "annual-report"],
        customerLifecycle: ["awareness", "consideration", "purchase", "retention", "advocacy"],
        employeeWorkflows: ["onboarding", "time-tracking", "expense-report", "performance-review", "offboarding"],
      }
    })

    return Service.of({
      analyze,
      getProcesses: Effect.fn("BusinessIntelligence.getProcesses")(function* () {
        const result = yield* analyze()
        return result.processes
      }),
    })
  }),
)

export { layer }
