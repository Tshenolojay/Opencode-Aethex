export * as RepositoryView from "./repository-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface RepositoryViewData {
  readonly summary: string | undefined
  readonly hotspotCount: number
  readonly relevantFiles: readonly string[]
  readonly relevantModules: readonly string[]
  readonly changeImpact: string | undefined
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<RepositoryViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RepositoryView") {}

const project: Interface["project"] = Effect.fn("RepositoryView.project")(function* (pkg) {
  const ri = pkg.repositoryIntelligence
  return {
    summary: ri?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary,
    hotspotCount: ri?.hotspots.length ?? 0,
    relevantFiles: pkg.knowledgeBundle.relevantFiles.slice(0, 20),
    relevantModules: ri?.importantModules?.slice(0, 10) ?? [],
    changeImpact: ri?.changeImpact,
  } as RepositoryViewData
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
