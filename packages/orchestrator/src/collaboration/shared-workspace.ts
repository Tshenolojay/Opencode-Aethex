export * as SharedWorkspace from "./shared-workspace"

import { Context, Effect, Layer, Ref } from "effect"
import type { SharedArtifact, SharedWorkspaceState } from "../integration/collaboration-result"
import type { SpecialistWorkspaceData } from "../integration/execution-package"

interface InternalState {
  readonly artifacts: Map<string, SharedArtifact>
  readonly consumedBy: Map<string, string[]>
  readonly usageCount: number
}

export interface Interface {
  readonly publish: (artifact: SharedArtifact) => Effect.Effect<void>
  readonly consume: (consumerID: string, ownerID: string) => Effect.Effect<SharedArtifact | undefined>
  readonly getArtifact: (specialistID: string) => Effect.Effect<SharedArtifact | undefined>
  readonly getAll: () => Effect.Effect<SharedWorkspaceState>
  readonly buildFromWorkspaces: (workspaces: readonly SpecialistWorkspaceData[]) => Effect.Effect<SharedWorkspaceState>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SharedWorkspace") {}

function toArtifact(w: SpecialistWorkspaceData): SharedArtifact {
  return {
    specialistID: w.specialistID,
    findings: w.findings,
    observations: w.evidence,
    assumptions: w.risks,
    recommendations: w.recommendations,
    unresolvedIssues: w.openQuestions,
    confidence: w.confidence,
    timestamp: Date.now(),
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<InternalState>({
      artifacts: new Map(),
      consumedBy: new Map(),
      usageCount: 0,
    })

    const publish = Effect.fn("SharedWorkspace.publish")(function* (artifact) {
      yield* Ref.update(state, (s) => {
        const artifacts = new Map(s.artifacts)
        artifacts.set(artifact.specialistID, artifact)
        return { ...s, artifacts }
      })
    })

    const consume = Effect.fn("SharedWorkspace.consume")(function* (consumerID, ownerID) {
      const current = yield* Ref.get(state)
      const artifact = current.artifacts.get(ownerID)
      if (artifact === undefined) return undefined
      yield* Ref.update(state, (s) => {
        const consumedBy = new Map(s.consumedBy)
        const list = consumedBy.get(consumerID) ?? []
        consumedBy.set(consumerID, [...list, ownerID])
        return { ...s, consumedBy, usageCount: s.usageCount + 1 }
      })
      return artifact
    })

    const getArtifact = Effect.fn("SharedWorkspace.getArtifact")(function* (specialistID) {
      return yield* Ref.get(state).pipe(Effect.map((s) => s.artifacts.get(specialistID)))
    })

    const getAll = Effect.fn("SharedWorkspace.getAll")(function* () {
      const s = yield* Ref.get(state)
      return {
        artifacts: Object.fromEntries(s.artifacts),
        consumedBy: Object.fromEntries(s.consumedBy),
        usageCount: s.usageCount,
      }
    })

    const buildFromWorkspaces = Effect.fn("SharedWorkspace.buildFromWorkspaces")(function* (workspaces) {
      const artifacts = new Map<string, SharedArtifact>()
      for (const w of workspaces) artifacts.set(w.specialistID, toArtifact(w))
      yield* Ref.set(state, { artifacts, consumedBy: new Map(), usageCount: 0 })
      return {
        artifacts: Object.fromEntries(artifacts),
        consumedBy: {},
        usageCount: 0,
      }
    })

    return Service.of({ publish, consume, getArtifact, getAll, buildFromWorkspaces })
  }),
)

export { layer }
