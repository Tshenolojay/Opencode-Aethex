export * as PreferenceManager from "./preference-manager"

import { Context, Effect, Layer, Ref } from "effect"
import type { Capability } from "../types/capability"

export type PreferenceCategory = "model" | "provider" | "routing" | "quality" | "cost"

export interface Preference {
  readonly category: PreferenceCategory
  readonly key: string
  readonly value: string | number | boolean
  readonly updatedAt: number
}

export interface UserPreferences {
  readonly defaultRoutingPolicy: string | undefined
  readonly preferredProviders: readonly string[]
  readonly preferredModels: readonly string[]
  readonly excludedProviders: readonly string[]
  readonly excludedModels: readonly string[]
  readonly qualityThreshold: number | undefined
  readonly costThreshold: number | undefined
  readonly latencyThreshold: number | undefined
  readonly capabilityPreferences: ReadonlyMap<Capability, string>
  readonly all: ReadonlyMap<string, Preference>
}

export interface Interface {
  readonly set: (category: PreferenceCategory, key: string, value: string | number | boolean) => Effect.Effect<void>
  readonly get: (category: PreferenceCategory, key: string) => Effect.Effect<Preference | undefined>
  readonly remove: (category: PreferenceCategory, key: string) => Effect.Effect<void>
  readonly getPreferences: () => Effect.Effect<UserPreferences>
  readonly setCapabilityPreference: (capability: Capability, preferredModel: string) => Effect.Effect<void>
  readonly reset: () => Effect.Effect<void>
}

function prefKey(category: PreferenceCategory, key: string): string {
  return `${category}:${key}`
}

const make = Effect.gen(function* () {
  const stateRef = yield* Ref.make<ReadonlyMap<string, Preference>>(new Map())

  const set = (category: PreferenceCategory, key: string, value: string | number | boolean) =>
    Ref.update(stateRef, (prev) => {
      const next = new Map(prev)
      next.set(prefKey(category, key), { category, key, value, updatedAt: Date.now() })
      return next
    })

  const get = (category: PreferenceCategory, key: string) =>
    Effect.map(Ref.get(stateRef), (s) => s.get(prefKey(category, key)))

  const remove = (category: PreferenceCategory, key: string) =>
    Ref.update(stateRef, (prev) => {
      const next = new Map(prev)
      next.delete(prefKey(category, key))
      return next
    })

  const getPreferences = () => Effect.map(Ref.get(stateRef), (all) => {
    const byCategory = new Map<string, Preference[]>()
    for (const pref of all.values()) {
      const list = byCategory.get(pref.category) ?? []
      list.push(pref)
      byCategory.set(pref.category, list)
    }

    const modelPrefs = byCategory.get("model") ?? []
    const providerPrefs = byCategory.get("provider") ?? []
    const routingPrefs = byCategory.get("routing") ?? []
    const qualityPrefs = byCategory.get("quality") ?? []
    const costPrefs = byCategory.get("cost") ?? []

    const capabilityPreferences = new Map<Capability, string>()
    for (const p of all.values()) {
      if (p.category === "model" && p.key.startsWith("capability:")) {
        capabilityPreferences.set(p.key.slice("capability:".length) as Capability, p.value as string)
      }
    }

    const findStrList = (prefs: Preference[], key: string): string[] => {
      const p = prefs.find((x) => x.key === key)
      if (!p || typeof p.value !== "string") return []
      return p.value.split(",").filter(Boolean)
    }

    return {
      defaultRoutingPolicy: routingPrefs.find((p) => p.key === "default")?.value as string | undefined,
      preferredProviders: findStrList(providerPrefs, "preferred"),
      preferredModels: findStrList(modelPrefs, "preferred"),
      excludedProviders: findStrList(providerPrefs, "excluded"),
      excludedModels: findStrList(modelPrefs, "excluded"),
      qualityThreshold: qualityPrefs.find((p) => p.key === "threshold")?.value as number | undefined,
      costThreshold: costPrefs.find((p) => p.key === "threshold")?.value as number | undefined,
      latencyThreshold: qualityPrefs.find((p) => p.key === "latency")?.value as number | undefined,
      capabilityPreferences,
      all,
    }
  })

  const setCapabilityPreference = (capability: Capability, preferredModel: string) =>
    set("model", `capability:${capability}`, preferredModel)

  const reset = () => Ref.set(stateRef, new Map())

  return Service.of({ set, get, remove, getPreferences, setCapabilityPreference, reset })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PreferenceManager") {}

const layer = Layer.effect(Service, make)
export { layer }
