export * as ExecutionPackage from "./execution-package"

import { Schema } from "effect"
import { optional } from "./schema"
import { Event } from "./event"
import { SessionID } from "./session-id"

const stringArray = Schema.Array(Schema.String)

export const Info = Schema.Struct({
  sessionID: SessionID,
  timestamp: Schema.Number,
  // Execution panel
  currentTask: optional(Schema.String),
  confidence: optional(Schema.String),
  confidenceScore: optional(Schema.Number),
  status: optional(Schema.String),
  progress: optional(Schema.Number),
  activeWorkflow: optional(Schema.String),
  // Specialists panel
  specialists: optional(Schema.Array(Schema.Struct({
    name: Schema.String,
    role: optional(Schema.String),
  }))),
  planningSummary: optional(Schema.String),
  consensusSummary: optional(Schema.String),
  // Models panel
  provider: optional(Schema.String),
  model: optional(Schema.String),
  capabilityMatch: optional(Schema.String),
  routingStrategy: optional(Schema.String),
  fallbackModel: optional(Schema.String),
  // Knowledge panel
  repositoryIntelligence: optional(Schema.String),
  architectureSummary: optional(Schema.String),
  dependencySummary: optional(Schema.String),
  documentationSummary: optional(Schema.String),
  verificationSummary: optional(Schema.String),
  // Planning panel
  recommendations: optional(stringArray),
  risks: optional(stringArray),
  constraints: optional(stringArray),
  toolAdvice: optional(stringArray),
  workflowSuggestions: optional(stringArray),
}).annotate({ identifier: "ExecutionPackage" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

export const Updated = Event.define({
  type: "execution.package.updated",
  schema: {
    sessionID: SessionID,
    package: Info,
  },
})

export const PlanningUpdated = Event.define({
  type: "execution.planning.updated",
  schema: {
    sessionID: SessionID,
    summary: optional(Schema.String),
    recommendations: optional(stringArray),
    risks: optional(stringArray),
    constraints: optional(stringArray),
  },
})

export const ReasoningUpdated = Event.define({
  type: "execution.reasoning.updated",
  schema: {
    sessionID: SessionID,
    confidence: optional(Schema.String),
    confidenceScore: optional(Schema.Number),
  },
})

export const SpecialistPlanUpdated = Event.define({
  type: "execution.specialist-plan.updated",
  schema: {
    sessionID: SessionID,
    specialists: optional(Schema.Array(Schema.Struct({
      name: Schema.String,
      role: optional(Schema.String),
    }))),
    consensusSummary: optional(Schema.String),
  },
})

export const ModelSelectionUpdated = Event.define({
  type: "execution.model-selection.updated",
  schema: {
    sessionID: SessionID,
    provider: optional(Schema.String),
    model: optional(Schema.String),
    capabilityMatch: optional(Schema.String),
    routingStrategy: optional(Schema.String),
    fallbackModel: optional(Schema.String),
  },
})

export const ExecutionCompleted = Event.define({
  type: "execution.completed",
  schema: {
    sessionID: SessionID,
    currentTask: optional(Schema.String),
    status: optional(Schema.String),
  },
})

export const Definitions = Event.inventory(
  Updated,
  PlanningUpdated,
  ReasoningUpdated,
  SpecialistPlanUpdated,
  ModelSelectionUpdated,
  ExecutionCompleted,
)
