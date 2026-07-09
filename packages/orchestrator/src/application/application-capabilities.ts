export * as ApplicationCapabilities from "./application-capabilities"

import { Context, Effect, Layer, Ref } from "effect"

export type ApplicationCapability = string

export interface CapabilityDefinition {
  readonly name: ApplicationCapability
  readonly description: string
  readonly category: "core" | "business" | "integration" | "analytics" | "automation" | "communication" | "research"
  readonly providedBy: readonly string[]
}

export const BUILT_IN_CAPABILITIES: readonly CapabilityDefinition[] = [
  { name: "marketing", description: "Marketing campaign management and analytics", category: "business", providedBy: [] },
  { name: "commerce", description: "E-commerce and transaction processing", category: "core", providedBy: [] },
  { name: "inventory", description: "Inventory tracking and management", category: "business", providedBy: [] },
  { name: "crm", description: "Customer relationship management", category: "business", providedBy: [] },
  { name: "analytics", description: "Data analysis and reporting", category: "analytics", providedBy: [] },
  { name: "coding", description: "Software development and code generation", category: "core", providedBy: [] },
  { name: "documents", description: "Document creation and management", category: "business", providedBy: [] },
  { name: "automation", description: "Workflow and process automation", category: "automation", providedBy: [] },
  { name: "scheduling", description: "Event and task scheduling", category: "business", providedBy: [] },
  { name: "messaging", description: "Messaging and notifications", category: "communication", providedBy: [] },
  { name: "research", description: "Research and information gathering", category: "research", providedBy: [] },
  { name: "planning", description: "Task and project planning", category: "core", providedBy: [] },
  { name: "search", description: "Information search and retrieval", category: "core", providedBy: [] },
  { name: "verification", description: "Validation and verification", category: "analytics", providedBy: [] },
]

export interface Interface {
  readonly getAvailableCapabilities: () => Effect.Effect<readonly CapabilityDefinition[]>
  readonly getCapabilitiesByCategory: (category: CapabilityDefinition["category"]) => Effect.Effect<readonly CapabilityDefinition[]>
  readonly registerCustomCapability: (capability: CapabilityDefinition) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationCapabilities") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const customCaps = yield* Ref.make<CapabilityDefinition[]>([])

    const getAvailableCapabilities: Interface["getAvailableCapabilities"] = Effect.fn("ApplicationCapabilities.getAvailableCapabilities")(function* () {
      const custom = yield* Ref.get(customCaps)
      return [...BUILT_IN_CAPABILITIES, ...custom]
    })

    return Service.of({
      getAvailableCapabilities,
      getCapabilitiesByCategory: Effect.fn("ApplicationCapabilities.getCapabilitiesByCategory")(function* (category) {
        const all = yield* getAvailableCapabilities()
        return all.filter((c) => c.category === category)
      }),
      registerCustomCapability: Effect.fn("ApplicationCapabilities.registerCustomCapability")(function* (capability) {
        yield* Ref.update(customCaps, (c) => [...c, capability])
      }),
    })
  }),
)

export { layer }
