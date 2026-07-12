export * as ContextIntelligence from "./context-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle, KnowledgeEntryMeta } from "../knowledge/knowledge"

export interface ContextQualityReport {
  readonly totalKnowledgeTypes: number
  readonly uniqueFacts: number
  readonly duplicates: number
  readonly averageConfidence: number
  readonly missingCriticalFields: readonly string[]
  readonly optimizedSummary: string
}

export interface Interface {
  readonly prepare: (bundle: KnowledgeBundle) => Effect.Effect<ContextQualityReport>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ContextIntelligence") {}

const prepare: Interface["prepare"] = Effect.fn("ContextIntelligence.prepare")(function* (bundle) {
  const fields = collectPresentFields(bundle)
  const totalKnowledgeTypes = fields.length

  const meta = bundle.knowledgeMeta ?? {}
  const confidences = Object.values(meta).map((m: unknown) => (m as Record<string, unknown>).confidence as number).filter((c) => c > 0)
  const averageConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0

  const criticalFields = ["repositorySummary", "relevantFiles", "architectureSummary"] as const
  const missingCriticalFields = criticalFields.filter((f) => {
    const v = (bundle as unknown as Record<string, unknown>)[f]
    return v === undefined || (Array.isArray(v) && v.length === 0)
  }) as readonly string[]

  const duplicateCount = countDuplicates(bundle)

  const optimizedSummary = buildOptimizedSummary(bundle, averageConfidence, duplicateCount)

  return {
    totalKnowledgeTypes,
    uniqueFacts: totalKnowledgeTypes * 2,
    duplicates: duplicateCount,
    averageConfidence,
    missingCriticalFields,
    optimizedSummary,
  }
})

function collectPresentFields(bundle: KnowledgeBundle): string[] {
  const fields: string[] = []
  for (const [key, value] of Object.entries(bundle)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) fields.push(key)
      else if (typeof value === "string" && value.length > 0) fields.push(key)
    }
  }
  return fields
}

function countDuplicates(bundle: KnowledgeBundle): number {
  let count = 0
  const seen = new Set<string>()

  for (const file of bundle.relevantFiles) {
    if (seen.has(file)) count++
    seen.add(file)
  }

  for (const result of bundle.searchResults) {
    if (seen.has(result.content)) count++
    seen.add(result.content)
  }

  return count
}

function buildOptimizedSummary(bundle: KnowledgeBundle, avgConfidence: number, duplicates: number): string {
  const parts: string[] = [`Context prepared for ${bundle.taskType}`]
  if (bundle.repositorySummary) parts.push(`Repository: ${bundle.repositorySummary.slice(0, 200)}`)
  if (bundle.architectureSummary) parts.push(`Architecture: ${bundle.architectureSummary.slice(0, 200)}`)
  if (bundle.contextSummary) parts.push(`Context: ${bundle.contextSummary.slice(0, 200)}`)
  if (bundle.relevantFiles.length > 0) parts.push(`Files: ${bundle.relevantFiles.slice(0, 5).join(", ")}${bundle.relevantFiles.length > 5 ? ` +${bundle.relevantFiles.length - 5} more` : ""}`)
  parts.push(`Confidence: ${(avgConfidence * 100).toFixed(0)}%`)

  return parts.join("\n")
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ prepare })
  }),
)

export { layer }
