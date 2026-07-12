export * as RepositoryConnector from "./repository-connector"

import { Context, Effect, Layer } from "effect"
import type { ConnectorResult, ExecutionPackage } from "../integration/execution-package"

export interface Interface {
  readonly prepare: (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RepositoryConnector") {}

const prepare: Interface["prepare"] = Effect.fn("RepositoryConnector.prepare")(function* (pkg) {
  const repoIntel = pkg.repositoryIntelligence
  const summary = pkg.knowledgeBundle.repositorySummary

  const hasData = (repoIntel?.hotspots.length ?? 0) > 0 || summary != null

  return {
    sourceType: "repository",
    status: hasData ? "prepared" : "skipped",
    metadata: {
      hotspots: String(repoIntel?.hotspots.length ?? 0),
      changeImpact: repoIntel?.changeImpact ?? "none",
      hasSummary: summary != null ? "true" : "false",
    },
    confidence: hasData ? 0.9 : 0.3,
    error: undefined,
  }
}) as (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult, never, never>

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ prepare })
  }),
)

export { layer }
