export * as CapabilityMarketplace from "./capability-marketplace"

import { Context, Effect, Layer, Ref } from "effect"
import type { VirtualTeam, CapabilityMarketplace as CapMarketplaceState, CapabilityAdvertisement } from "../integration/execution-package"
import { DefaultSpecialists } from "../specialists/profiles"
import type { Capability } from "../types/capability"

export interface SpecialistAdvert {
  readonly specialistID: string
  readonly supportedCapabilities: readonly Capability[]
  readonly requiredCapabilities: readonly Capability[]
  readonly executionPreferences: readonly string[]
  readonly preferredModelCharacteristics: readonly string[]
  readonly reusableExpertise: readonly string[]
  readonly confidenceLevel: number
}

export interface Interface {
  readonly build: (team: VirtualTeam) => Effect.Effect<CapMarketplaceState>
  readonly advertise: (ad: SpecialistAdvert) => Effect.Effect<void>
  readonly findSpecialistsByCapability: (capability: Capability) => Effect.Effect<readonly SpecialistAdvert[]>
  readonly getAllAdvertisements: () => Effect.Effect<readonly SpecialistAdvert[]>
  readonly removeAdvertisement: (specialistID: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityMarketplace") {}

const build: Interface["build"] = Effect.fn("CapabilityMarketplace.build")(function* (team) {
  const advertisements: CapabilityAdvertisement[] = team.activeParticipants.map((id) => {
    const profile = DefaultSpecialists.find((s) => s.id === id)
    return {
      specialistID: id,
      provides: profile?.produces ?? profile?.requiredCapabilities ?? [],
      consumes: profile?.consumes ?? profile?.preferredKnowledge ?? [],
      requires: profile?.requires ?? [],
      optionalCapabilities: profile?.optionalCapabilities ?? [],
      preferredCapabilities: profile?.preferredCapabilities ?? profile?.preferredKnowledge ?? [],
      supportedKnowledgeSources: undefined,
    }
  })

  return { advertisements }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const ads = yield* Ref.make<Map<string, SpecialistAdvert>>(new Map())

    const advertise: Interface["advertise"] = Effect.fn("CapabilityMarketplace.advertise")(function* (ad) {
      yield* Ref.update(ads, (map) => { map.set(ad.specialistID, ad); return map })
    })

    const findSpecialistsByCapability: Interface["findSpecialistsByCapability"] = Effect.fn("CapabilityMarketplace.findSpecialistsByCapability")(function* (capability) {
      const map = yield* Ref.get(ads)
      return Array.from(map.values()).filter((a) => a.supportedCapabilities.includes(capability))
    })

    const getAllAdvertisements: Interface["getAllAdvertisements"] = Effect.fn("CapabilityMarketplace.getAllAdvertisements")(function* () {
      const map = yield* Ref.get(ads)
      return Array.from(map.values())
    })

    const removeAdvertisement: Interface["removeAdvertisement"] = Effect.fn("CapabilityMarketplace.removeAdvertisement")(function* (specialistID) {
      yield* Ref.update(ads, (map) => { map.delete(specialistID); return map })
    })

    return Service.of({ build, advertise, findSpecialistsByCapability, getAllAdvertisements, removeAdvertisement })
  }),
)

export { layer }
