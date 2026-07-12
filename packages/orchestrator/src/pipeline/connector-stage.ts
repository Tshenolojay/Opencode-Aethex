import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { ConnectorCoordinator } from "../connectors/connector-coordinator"

export const runConnectorStage = Effect.fn("Pipeline.connector")(function* (state: PipelineState) {
  const connectorCoordinator = yield* ConnectorCoordinator.Service

  const tConn = Date.now()
  const connectorOutput = yield* connectorCoordinator.coordinate(state.executionPackage)

  const preparedCount = connectorOutput.results.filter((r) => r.status === "prepared").length
  const skippedCount = connectorOutput.results.filter((r) => r.status === "skipped").length

  return {
    ...state,
    executionPackage: {
      ...state.executionPackage,
      connectorPlan: connectorOutput.plan,
      connectorResults: connectorOutput.results,
      connectorMetadata: connectorOutput.metadata,
      reusableKnowledgeSources: connectorOutput.results.filter((r) => r.status === "cached").map((r) => r.sourceType),
    },
    diagnostics: [
      ...state.diagnostics,
      { phase: "knowledge-connectors", durationMs: Date.now() - tConn, result: `prepared=${preparedCount} skipped=${skippedCount}`, error: undefined },
    ],
  } as PipelineState
})
