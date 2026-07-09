export * as ModelRequirements from "./model-requirements"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"

export interface ModelRequirementProfile {
  readonly requiresReasoning: boolean
  readonly requiresCoding: boolean
  readonly requiresSearch: boolean
  readonly requiresLongContext: boolean
  readonly requiresVision: boolean
  readonly requiresStreaming: boolean
  readonly requiresTools: boolean
  readonly requiresStructuredOutput: boolean
  readonly requiresMultimodal: boolean
  readonly minContextWindow: number
  readonly maxLatencyMs: number
  readonly maxCostPerToken: number
  readonly minQualityScore: number
  readonly capabilities: readonly Capability[]
}

export type RequirementPreset =
  | "highest-reasoning"
  | "lowest-latency"
  | "longest-context"
  | "lowest-cost"
  | "balanced"
  | "multimodal"
  | "verification-optimized"
  | "architecture-optimized"
  | "documentation-optimized"
  | "planning-optimized"

export const PRESETS: Record<RequirementPreset, ModelRequirementProfile> = {
  "highest-reasoning": {
    requiresReasoning: true, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 32000, maxLatencyMs: 5000, maxCostPerToken: 0.1, minQualityScore: 0.85,
    capabilities: ["reasoning", "analysis"],
  },
  "lowest-latency": {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: true,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 8000, maxLatencyMs: 500, maxCostPerToken: 0.05, minQualityScore: 0.5,
    capabilities: ["fast-response"],
  },
  "longest-context": {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: true, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 128000, maxLatencyMs: 10000, maxCostPerToken: 0.15, minQualityScore: 0.6,
    capabilities: ["long-context"],
  },
  "lowest-cost": {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 4000, maxLatencyMs: 10000, maxCostPerToken: 0.01, minQualityScore: 0.4,
    capabilities: ["cheap"],
  },
  balanced: {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 16000, maxLatencyMs: 3000, maxCostPerToken: 0.05, minQualityScore: 0.7,
    capabilities: [],
  },
  multimodal: {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: true, requiresStreaming: false,
    requiresTools: true,     requiresStructuredOutput: true, requiresMultimodal: true,
    minContextWindow: 32000, maxLatencyMs: 5000, maxCostPerToken: 0.1, minQualityScore: 0.7,
    capabilities: ["analysis", "reasoning"],
  },
  "verification-optimized": {
    requiresReasoning: true, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: true, requiresMultimodal: false,
    minContextWindow: 16000, maxLatencyMs: 5000, maxCostPerToken: 0.08, minQualityScore: 0.8,
    capabilities: ["reasoning", "analysis", "verification"],
  },
  "architecture-optimized": {
    requiresReasoning: true, requiresCoding: false, requiresSearch: false,
    requiresLongContext: true, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: false, requiresMultimodal: false,
    minContextWindow: 64000, maxLatencyMs: 5000, maxCostPerToken: 0.1, minQualityScore: 0.85,
    capabilities: ["reasoning", "planning", "analysis"],
  },
  "documentation-optimized": {
    requiresReasoning: false, requiresCoding: false, requiresSearch: false,
    requiresLongContext: true, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: true, requiresMultimodal: false,
    minContextWindow: 64000, maxLatencyMs: 5000, maxCostPerToken: 0.05, minQualityScore: 0.6,
    capabilities: ["long-context"],
  },
  "planning-optimized": {
    requiresReasoning: true, requiresCoding: false, requiresSearch: false,
    requiresLongContext: false, requiresVision: false, requiresStreaming: false,
    requiresTools: true, requiresStructuredOutput: true, requiresMultimodal: false,
    minContextWindow: 32000, maxLatencyMs: 5000, maxCostPerToken: 0.08, minQualityScore: 0.8,
    capabilities: ["planning", "reasoning"],
  },
}

export interface Interface {
  readonly getPreset: (preset: RequirementPreset) => ModelRequirementProfile
  readonly fromCapabilities: (capabilities: readonly Capability[]) => ModelRequirementProfile
  readonly merge: (a: ModelRequirementProfile, b: ModelRequirementProfile) => ModelRequirementProfile
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelRequirements") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      getPreset: (preset) => PRESETS[preset],
      fromCapabilities: (capabilities) => ({
        requiresReasoning: capabilities.includes("reasoning"),
        requiresCoding: capabilities.includes("code-generation"),
        requiresSearch: capabilities.includes("search"),
        requiresLongContext: capabilities.includes("long-context"),
        requiresVision: false,
        requiresStreaming: false,
        requiresTools: capabilities.includes("tool-use"),
        requiresStructuredOutput: false,
        requiresMultimodal: false,
        minContextWindow: capabilities.includes("long-context") ? 64000 : 16000,
        maxLatencyMs: capabilities.includes("fast-response") ? 500 : 5000,
        maxCostPerToken: capabilities.includes("cheap") ? 0.01 : 0.1,
        minQualityScore: 0.6,
        capabilities,
      }),
      merge: (a, b) => ({
        requiresReasoning: a.requiresReasoning || b.requiresReasoning,
        requiresCoding: a.requiresCoding || b.requiresCoding,
        requiresSearch: a.requiresSearch || b.requiresSearch,
        requiresLongContext: a.requiresLongContext || b.requiresLongContext,
        requiresVision: a.requiresVision || b.requiresVision,
        requiresStreaming: a.requiresStreaming || b.requiresStreaming,
        requiresTools: a.requiresTools || b.requiresTools,
        requiresStructuredOutput: a.requiresStructuredOutput || b.requiresStructuredOutput,
        requiresMultimodal: a.requiresMultimodal || b.requiresMultimodal,
        minContextWindow: Math.max(a.minContextWindow, b.minContextWindow),
        maxLatencyMs: Math.min(a.maxLatencyMs, b.maxLatencyMs),
        maxCostPerToken: Math.min(a.maxCostPerToken, b.maxCostPerToken),
        minQualityScore: Math.max(a.minQualityScore, b.minQualityScore),
        capabilities: [...new Set([...a.capabilities, ...b.capabilities])],
      }),
    })
  }),
)

export { layer }
