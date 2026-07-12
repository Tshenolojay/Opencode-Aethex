export * as ApplicationMemory from "./application-memory"

import { Context, Effect, Layer, Ref } from "effect"
import { ApplicationProfile, type ApplicationType, type BusinessDomain } from "./application-profile"
import { ApplicationIntelligence, type ApplicationSummary } from "./application-intelligence"

export interface MemoryEntry {
  readonly key: string
  readonly value: string
  readonly timestamp: number
}

export interface ApplicationMemoryData {
  readonly sessionID: string
  readonly discoveredArchitecture: readonly string[]
  readonly discoveredWorkflows: readonly string[]
  readonly discoveredModules: readonly string[]
  readonly terminology: readonly string[]
  readonly businessConcepts: readonly string[]
  readonly reusableSummaries: readonly string[]
  readonly previousInvestigations: readonly string[]
}

export interface Interface {
  readonly initialize: (sessionID: string) => Effect.Effect<void>
  readonly recordArchitecture: (sessionID: string, architecture: string) => Effect.Effect<void>
  readonly recordWorkflow: (sessionID: string, workflow: string) => Effect.Effect<void>
  readonly recordModule: (sessionID: string, module: string) => Effect.Effect<void>
  readonly recordTerm: (sessionID: string, term: string) => Effect.Effect<void>
  readonly recordConcept: (sessionID: string, concept: string) => Effect.Effect<void>
  readonly recordSummary: (sessionID: string, summary: string) => Effect.Effect<void>
  readonly recordInvestigation: (sessionID: string, investigation: string) => Effect.Effect<void>
  readonly get: (sessionID: string) => Effect.Effect<ApplicationMemoryData | undefined>
  readonly getReusableSummaries: (sessionID: string) => Effect.Effect<readonly string[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationMemory") {}

function emptyData(sessionID: string): ApplicationMemoryData {
  return {
    sessionID,
    discoveredArchitecture: [],
    discoveredWorkflows: [],
    discoveredModules: [],
    terminology: [],
    businessConcepts: [],
    reusableSummaries: [],
    previousInvestigations: [],
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Map<string, ApplicationMemoryData>>(new Map())

    const update = (sessionID: string, fn: (d: ApplicationMemoryData) => ApplicationMemoryData) =>
      Ref.update(store, (m) => {
        const current = m.get(sessionID) ?? emptyData(sessionID)
        const copy = new Map(m)
        copy.set(sessionID, fn(current))
        return copy
      })

    const initialize = Effect.fn("ApplicationMemory.initialize")(function* (sessionID) {
      yield* Ref.update(store, (m) => {
        if (m.has(sessionID)) return m
        const copy = new Map(m)
        copy.set(sessionID, emptyData(sessionID))
        return copy
      })
    })

    const recordArchitecture = Effect.fn("ApplicationMemory.recordArchitecture")(function* (sessionID, architecture) {
      yield* update(sessionID, (d) => ({ ...d, discoveredArchitecture: [...d.discoveredArchitecture, architecture] }))
    })

    const recordWorkflow = Effect.fn("ApplicationMemory.recordWorkflow")(function* (sessionID, workflow) {
      yield* update(sessionID, (d) => ({ ...d, discoveredWorkflows: [...d.discoveredWorkflows, workflow] }))
    })

    const recordModule = Effect.fn("ApplicationMemory.recordModule")(function* (sessionID, module) {
      yield* update(sessionID, (d) => ({ ...d, discoveredModules: [...d.discoveredModules, module] }))
    })

    const recordTerm = Effect.fn("ApplicationMemory.recordTerm")(function* (sessionID, term) {
      yield* update(sessionID, (d) => ({ ...d, terminology: [...d.terminology, term] }))
    })

    const recordConcept = Effect.fn("ApplicationMemory.recordConcept")(function* (sessionID, concept) {
      yield* update(sessionID, (d) => ({ ...d, businessConcepts: [...d.businessConcepts, concept] }))
    })

    const recordSummary = Effect.fn("ApplicationMemory.recordSummary")(function* (sessionID, summary) {
      yield* update(sessionID, (d) => ({ ...d, reusableSummaries: [...d.reusableSummaries, summary] }))
    })

    const recordInvestigation = Effect.fn("ApplicationMemory.recordInvestigation")(function* (sessionID, investigation) {
      yield* update(sessionID, (d) => ({ ...d, previousInvestigations: [...d.previousInvestigations, investigation] }))
    })

    const get = Effect.fn("ApplicationMemory.get")(function* (sessionID) {
      return yield* Ref.get(store).pipe(Effect.map((m) => m.get(sessionID)))
    })

    const getReusableSummaries = Effect.fn("ApplicationMemory.getReusableSummaries")(function* (sessionID) {
      const data = yield* get(sessionID)
      return data?.reusableSummaries ?? []
    })

    return Service.of({
      initialize, recordArchitecture, recordWorkflow, recordModule,
      recordTerm, recordConcept, recordSummary, recordInvestigation, get, getReusableSummaries,
    })
  }),
)

export { layer }
