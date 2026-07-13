export * as SpecialistRegistry from "./registry"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "./profiles"
export type { SpecialistProfile }
import { DefaultSpecialists } from "./profiles"
import type { BaseSpecialistInterface } from "./base-specialist"
import type { TaskType } from "../types/classification"
import type { Capability } from "../types/capability"
import type { ConfidenceLevel } from "../types/confidence"

export interface SpecialistMatch {
  readonly specialist: SpecialistProfile
  readonly matchScore: number
  readonly matchedCapabilities: readonly Capability[]
  readonly optionalCapabilities?: readonly string[] | undefined
  readonly minimumCapabilities?: readonly string[] | undefined
  readonly preferredCapabilities?: readonly string[] | undefined
  readonly preferredModelFamilies?: readonly string[] | undefined
  readonly preferredRoutingPolicy?: string | undefined
  readonly preferredRepositorySize?: "tiny" | "small" | "medium" | "large" | "huge" | undefined
  readonly preferredContextSize?: number | undefined
}

export interface FilterOptions {
  readonly taskTypes: readonly TaskType[] | undefined
  readonly requiredCapabilities: readonly Capability[] | undefined
  readonly minConfidence: ConfidenceLevel | undefined
  readonly maxSpecialists: number | undefined
}

export interface Interface {
  readonly register: (profile: SpecialistProfile) => Effect.Effect<void>
  readonly registerSpecialist: (specialist: BaseSpecialistInterface) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly SpecialistProfile[]>
  readonly getByID: (id: string) => Effect.Effect<SpecialistProfile | undefined>
  readonly getSpecialist: (id: string) => Effect.Effect<BaseSpecialistInterface | undefined>
  readonly getAllSpecialists: () => Effect.Effect<readonly BaseSpecialistInterface[]>
  readonly filterByCapabilities: (capabilities: readonly Capability[], options?: FilterOptions) => Effect.Effect<readonly SpecialistMatch[]>
  readonly filterByTaskType: (taskType: TaskType, options?: FilterOptions) => Effect.Effect<readonly SpecialistMatch[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRegistry") {}

function scoreSpecialist(specialist: SpecialistProfile, capabilities: readonly Capability[]): SpecialistMatch | undefined {
  if (specialist.requiredCapabilities.length === 0) return undefined

  const capSet = new Set<string>(capabilities as readonly string[])
  const matched = specialist.requiredCapabilities.filter((c) => capSet.has(c))

  if (matched.length === 0) return undefined

  const optionalMatched = (specialist.optionalCapabilities ?? []).filter((c) => capSet.has(c))
  const preferredMatched = (specialist.preferredCapabilities ?? []).filter((c) => capSet.has(c))
  const minimumMatched = (specialist.minimumCapabilities ?? []).filter((c) => capSet.has(c))

  const optionalBonus = specialist.optionalCapabilities && specialist.optionalCapabilities.length > 0
    ? (optionalMatched.length / specialist.optionalCapabilities.length) * 0.1
    : 0

  return {
    specialist,
    matchScore: matched.length / specialist.requiredCapabilities.length + optionalBonus,
    matchedCapabilities: matched as readonly Capability[],
    optionalCapabilities: optionalMatched,
    minimumCapabilities: minimumMatched,
    preferredCapabilities: preferredMatched,
    preferredModelFamilies: specialist.preferredModelFamilies,
    preferredRoutingPolicy: specialist.preferredRoutingPolicy,
    preferredRepositorySize: specialist.preferredRepositorySize,
    preferredContextSize: specialist.preferredContextSize,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registered: SpecialistProfile[] = [...DefaultSpecialists]
    const specialists = new Map<string, BaseSpecialistInterface>()

    const register = Effect.fn("SpecialistRegistry.register")(function* (profile: SpecialistProfile) {
      const existing = registered.findIndex((r) => r.id === profile.id)
      if (existing >= 0) {
        registered[existing] = profile
      } else {
        registered.push(profile)
      }
    })

    const registerSpecialist = Effect.fn("SpecialistRegistry.registerSpecialist")(function* (specialist: BaseSpecialistInterface) {
      specialists.set(specialist.id, specialist)
    })

    const getAll = () => Effect.sync(() => registered as readonly SpecialistProfile[])

    const getByID = Effect.fn("SpecialistRegistry.getByID")(function* (id: string) {
      return registered.find((r) => r.id === id)
    })

    const getSpecialist = Effect.fn("SpecialistRegistry.getSpecialist")(function* (id: string) {
      return specialists.get(id)
    })

    const getAllSpecialists = () => Effect.sync(() => [...specialists.values()])

    const filterByCapabilities = Effect.fn("SpecialistRegistry.filterByCapabilities")(function* (
      capabilities: readonly Capability[],
      options?: FilterOptions,
    ) {
      const max = options?.maxSpecialists ?? capabilities.length
      const results: SpecialistMatch[] = []

      for (const specialist of registered) {
        const match = scoreSpecialist(specialist, capabilities)
        if (match) results.push(match)
      }

      results.sort((a, b) => b.matchScore - a.matchScore)

      return results.slice(0, max)
    })

    const filterByTaskType = Effect.fn("SpecialistRegistry.filterByTaskType")(function* (
      taskType: TaskType,
      options?: FilterOptions,
    ) {
      const mappedCapabilities = taskTypeToCapabilities(taskType)
      return yield* filterByCapabilities(mappedCapabilities, options)
    })

    return Service.of({
      register, registerSpecialist, getAll, getByID, getSpecialist, getAllSpecialists,
      filterByCapabilities, filterByTaskType,
    })
  }),
)

export { layer }

function taskTypeToCapabilities(taskType: TaskType): Capability[] {
  const map: Record<TaskType, Capability[]> = {
    "code-generation": ["code-generation", "tool-use", "reasoning"],
    "bug-fix": ["analysis", "reasoning"],
    debugging: ["analysis", "reasoning", "tool-use"],
    "repository-search": ["search", "repository-understanding"],
    "dependency-investigation": ["search", "analysis"],
    "architecture-design": ["analysis", "reasoning", "planning"],
    documentation: ["documentation-analysis", "analysis"],
    testing: ["code-generation", "analysis", "tool-use"],
    refactoring: ["code-generation", "reasoning", "repository-understanding"],
    "performance-optimisation": ["analysis", "reasoning"],
    "security-review": ["analysis", "reasoning"],
    "general-chat": ["reasoning"],
  }
  return map[taskType]
}
