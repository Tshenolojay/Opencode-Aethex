export * as ApplicationWorkflows from "./application-workflows"

import { Context, Effect, Layer, Ref } from "effect"

export type WorkflowCategory = "business" | "technical" | "analysis" | "automation" | "communication" | "approval"

export interface BusinessWorkflow {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: WorkflowCategory
  readonly steps: readonly string[]
  readonly requiredCapabilities: readonly string[]
  readonly estimatedComplexity: number
  readonly typicalDuration: string | undefined
}

export const BUILT_IN_WORKFLOWS: readonly BusinessWorkflow[] = [
  { id: "marketing-campaign", name: "Marketing Campaign", description: "End-to-end marketing campaign management", category: "business", steps: ["plan", "create", "review", "launch", "monitor"], requiredCapabilities: ["marketing", "analytics", "planning"], estimatedComplexity: 0.7, typicalDuration: "days" },
  { id: "order-processing", name: "Order Processing", description: "Order fulfillment and tracking", category: "business", steps: ["receive", "validate", "process", "fulfill", "confirm"], requiredCapabilities: ["commerce", "inventory"], estimatedComplexity: 0.5, typicalDuration: "hours" },
  { id: "inventory-sync", name: "Inventory Sync", description: "Synchronize inventory across systems", category: "automation", steps: ["detect-changes", "validate", "sync", "verify"], requiredCapabilities: ["inventory", "automation"], estimatedComplexity: 0.4, typicalDuration: "minutes" },
  { id: "deployment", name: "Deployment", description: "Software deployment pipeline", category: "technical", steps: ["build", "test", "stage", "deploy", "verify"], requiredCapabilities: ["coding", "automation", "verification"], estimatedComplexity: 0.6, typicalDuration: "minutes" },
  { id: "customer-support", name: "Customer Support", description: "Customer issue resolution workflow", category: "communication", steps: ["triage", "investigate", "resolve", "follow-up"], requiredCapabilities: ["crm", "messaging", "research"], estimatedComplexity: 0.5, typicalDuration: "hours" },
  { id: "research", name: "Research", description: "Information research and synthesis", category: "analysis", steps: ["query", "gather", "analyze", "summarize"], requiredCapabilities: ["research", "search", "analytics"], estimatedComplexity: 0.3, typicalDuration: "minutes" },
  { id: "document-approval", name: "Document Approval", description: "Document review and approval chain", category: "approval", steps: ["create", "submit", "review", "approve", "archive"], requiredCapabilities: ["documents", "planning"], estimatedComplexity: 0.3, typicalDuration: "hours" },
  { id: "planning", name: "Planning", description: "Task and project planning session", category: "business", steps: ["define", "estimate", "assign", "schedule"], requiredCapabilities: ["planning", "analytics"], estimatedComplexity: 0.4, typicalDuration: "hours" },
]

export interface Interface {
  readonly getWorkflows: () => Effect.Effect<readonly BusinessWorkflow[]>
  readonly getWorkflowsByCategory: (category: WorkflowCategory) => Effect.Effect<readonly BusinessWorkflow[]>
  readonly registerWorkflow: (workflow: BusinessWorkflow) => Effect.Effect<void>
  readonly discoverWorkflows: () => Effect.Effect<readonly BusinessWorkflow[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationWorkflows") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const customWorkflows = yield* Ref.make<BusinessWorkflow[]>([])

    const getWorkflows: Interface["getWorkflows"] = Effect.fn("ApplicationWorkflows.getWorkflows")(function* () {
      const custom = yield* Ref.get(customWorkflows)
      return [...BUILT_IN_WORKFLOWS, ...custom]
    })

    return Service.of({
      getWorkflows,
      getWorkflowsByCategory: Effect.fn("ApplicationWorkflows.getWorkflowsByCategory")(function* (category) {
        const all = yield* getWorkflows()
        return all.filter((w) => w.category === category)
      }),
      registerWorkflow: Effect.fn("ApplicationWorkflows.registerWorkflow")(function* (workflow) {
        yield* Ref.update(customWorkflows, (w) => [...w, workflow])
      }),
      discoverWorkflows: Effect.fn("ApplicationWorkflows.discoverWorkflows")(function* () {
        return yield* getWorkflows()
      }),
    })
  }),
)

export { layer }
