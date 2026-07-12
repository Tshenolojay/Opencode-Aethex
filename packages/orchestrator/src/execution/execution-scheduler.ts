export * as ExecutionScheduler from "./execution-scheduler"

import { Array, Context, Effect, Layer, Order } from "effect"
import type { Graph, GraphNode } from "../planner/execution-graph"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import { SpecialistRegistry } from "../specialists/registry"
import { ExecutionBudget } from "./execution-budget"

export interface ScheduleBatch {
  readonly index: number
  readonly nodeIDs: readonly string[]
  readonly parallel: boolean
}

export interface Schedule {
  readonly batches: readonly ScheduleBatch[]
  readonly totalBatches: number
  readonly estimatedDurationMs: number
  readonly budgetAware: boolean
  readonly capabilityAware: boolean
  readonly confidenceAware: boolean
}

export interface ScheduleInput {
  readonly graph: Graph
  readonly policy: PlanningPolicy
  readonly capabilityPlan: CapabilityPlan
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly repositorySize: number
  readonly budgetAware?: boolean
  readonly capabilityAware?: boolean
  readonly confidenceAware?: boolean
}

export interface Interface {
  readonly schedule: (input: ScheduleInput) => Effect.Effect<Schedule>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionScheduler") {}

function dependsOn(graph: Graph, node: GraphNode, other: GraphNode): boolean {
  return graph.edges.some((e) => e.from === other.id && e.to === node.id && (e.kind === "depends-on" || e.kind === "sequential"))
}

const schedule: Interface["schedule"] = Effect.fn("ExecutionScheduler.schedule")(function* (input) {
  const { graph, policy, repositorySize, budgetAware, capabilityAware, confidenceAware } = input
  const registry = yield* SpecialistRegistry.Service
  const budget = yield* ExecutionBudget.Service
  const allProfiles = yield* registry.getAll()
  const specialistNodes = graph.nodes.filter((n: GraphNode) => n.type === "specialist")

  if (specialistNodes.length === 0) {
    return { batches: [], totalBatches: 0, estimatedDurationMs: 0, budgetAware: false, capabilityAware: false, confidenceAware: false }
  }

  const contractMap = new Map<string, { requires: readonly string[]; produces: readonly string[] }>()
  for (const profile of allProfiles) {
    contractMap.set(profile.id, { requires: profile.contract.requires, produces: profile.contract.produces })
  }

  const producedBy = new Map<string, string>()
  for (const node of specialistNodes) {
    const contract = contractMap.get(node.id)
    if (contract) {
      for (const p of contract.produces) {
        producedBy.set(p, node.id)
      }
    }
  }

  const maxParallel = policy.maxSpecialists > 0 ? Math.min(policy.maxSpecialists, 4) : 1

  let orderedNodes = [...specialistNodes]

  if (confidenceAware && input.capabilityPlan) {
    const highPriority = new Set(input.capabilityPlan.highPriority)
    orderedNodes = Array.sort(orderedNodes, Order.flip(Order.mapInput(Order.Number, (n: GraphNode) => highPriority.has(n.id) ? 2 : 1)))
  }

  if (capabilityAware && input.capabilityPlan) {
    const required = new Set(input.capabilityPlan.required)
    orderedNodes = Array.sort(orderedNodes, Order.flip(Order.mapInput(Order.Number, (n: GraphNode) => required.has(n.id) ? 2 : 1)))
  }

  const batches: ScheduleBatch[] = []
  const scheduled = new Set<string>()
  let index = 0

  while (scheduled.size < orderedNodes.length) {
    const ready = orderedNodes.filter((n) => {
      if (scheduled.has(n.id)) return false

      if (budgetAware) {
        const hasTime = budget.hasBudget("timeMs")
        const hasSpecialists = budget.hasBudget("specialistsUsed")
        if (!hasTime || !hasSpecialists) return false
      }

      const contract = contractMap.get(n.id)
      if (!contract || contract.requires.length === 0) return true

      return contract.requires.every((req) => {
        const producer = producedBy.get(req)
        return !producer || scheduled.has(producer)
      })
    })

    if (ready.length === 0) break

    if (ready.length > 1 && maxParallel >= 2) {
      const parallelGroup: string[] = []
      for (const node of ready) {
        if (parallelGroup.length >= maxParallel) break
        const contract = contractMap.get(node.id)
        const dependsOnGroup = contract
          ? contract.requires.some((req) => {
              const producer = producedBy.get(req)
              return producer !== undefined && parallelGroup.includes(producer)
            })
          : false
        if (!dependsOnGroup) {
          parallelGroup.push(node.id)
        }
      }
      if (parallelGroup.length > 0) {
        batches.push({ index, nodeIDs: parallelGroup, parallel: parallelGroup.length > 1 })
        parallelGroup.forEach((id) => scheduled.add(id))
      } else {
        batches.push({ index, nodeIDs: [ready[0].id], parallel: false })
        scheduled.add(ready[0].id)
      }
    } else {
      batches.push({ index, nodeIDs: [ready[0].id], parallel: false })
      scheduled.add(ready[0].id)
    }
    index++
  }

  const estimatedDurationMs = batches.reduce((acc, b) => {
    const nodes = b.nodeIDs.map((id) => graph.nodes.find((n: GraphNode) => n.id === id)).filter(Boolean) as GraphNode[]
    const maxInBatch = nodes.reduce((m, n) => Math.max(m, n.estimatedDurationMs), 0)
    return acc + maxInBatch
  }, 0)

  const multiplier = repositorySize > 5000 ? 1.2 : 1

  return {
    batches,
    totalBatches: batches.length,
    estimatedDurationMs: estimatedDurationMs * multiplier,
    budgetAware: budgetAware ?? false,
    capabilityAware: capabilityAware ?? false,
    confidenceAware: confidenceAware ?? false,
  }
}) as unknown as Interface["schedule"]

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ schedule })
  }),
)

export { layer }
