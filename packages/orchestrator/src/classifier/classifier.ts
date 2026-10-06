export * as TaskClassifier from "./classifier"

import { Context, Effect, Layer, Schema } from "effect"
import { TaskType } from "../types/classification"
import { TaskClassification, type TaskClassification as _TaskClassification } from "./schema"
import { ClassifierInput, type ClassifierInputRich, type ClassifierSignal, type ClassificationResult } from "./schema"

export interface Interface {
  readonly classify: (input: ClassifierInput) => Effect.Effect<TaskClassification>
  readonly classifyRich: (input: ClassifierInputRich) => Effect.Effect<readonly ClassificationResult[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/TaskClassifier") {}

const classify: Interface["classify"] = Effect.fn("TaskClassifier.classify")(function* (input) {
  const text = input.text.toLowerCase()

  let type: TaskType = "general-chat"
  let complexity = 0.3
  let requiresContext = true
  let requiresSearch = false
  let requiresDependencyGraph = false
  let requiresVerification = false

  if (/fix|bug|error|crash|issue|broken|fail|incorrect/.test(text)) {
    type = "bug-fix"
    complexity = 0.6
    requiresSearch = true
    requiresVerification = true
  } else if (/debug|trace|log|stack|inspect|investigate/.test(text)) {
    type = "debugging"
    complexity = 0.5
    requiresSearch = true
  } else if (/design|architecture|plan|structure|organi[sz]e/.test(text)) {
    type = "architecture-design"
    complexity = 0.8
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/refactor|clean|restructure|simplify|deduplicate/.test(text)) {
    type = "refactoring"
    complexity = 0.6
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/test|spec|coverage|assert|mock|jest|vitest/.test(text)) {
    type = "testing"
    complexity = 0.5
    requiresVerification = true
  } else if (/doc|readme|document|comment|explain|describe/.test(text)) {
    type = "documentation"
    complexity = 0.3
  } else if (/perform|optimise|optimize|slow|fast|latency|bottleneck/.test(text)) {
    type = "performance-optimisation"
    complexity = 0.7
    requiresSearch = true
    requiresVerification = true
  } else if (/search|find|locate|where|lookup|discover/.test(text)) {
    type = "repository-search"
    complexity = 0.2
    requiresSearch = true
  } else if (/dependenc|package\.json|cargo\.toml|module|import|require/.test(text)) {
    type = "dependency-investigation"
    complexity = 0.4
    requiresDependencyGraph = true
  } else if (/secur|vulnerab|exploit|auth|permission|sanitize/.test(text)) {
    type = "security-review"
    complexity = 0.8
    requiresSearch = true
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/generat|create|implement|build|add\s+(a|an|the)\s+(function|class|component|api|endpoint|route|controller|service|handler)/.test(text)) {
    type = "code-generation"
    complexity = 0.5
  }

  if (input.filesAttached) {
    requiresContext = true
    complexity = Math.min(complexity + 0.1, 1.0)
  }

  if (input.conversationLength > 10) {
    complexity = Math.min(complexity + 0.15 * (input.conversationLength / 20), 1.0)
  }

  return Schema.decodeSync(TaskClassification)({
    type,
    complexity,
    requiresContext,
    requiresSearch,
    requiresDependencyGraph,
    requiresVerification,
    confidence: "high",
  })
})

function classifyText(text: string): { type: TaskType; complexity: number; requiresContext: boolean; requiresSearch: boolean; requiresDependencyGraph: boolean; requiresVerification: boolean } {
  const lower = text.toLowerCase()

  let type: TaskType = "general-chat"
  let complexity = 0.3
  let requiresContext = true
  let requiresSearch = false
  let requiresDependencyGraph = false
  let requiresVerification = false

  if (/fix|bug|error|crash|issue|broken|fail|incorrect/.test(lower)) {
    type = "bug-fix"
    complexity = 0.6
    requiresSearch = true
    requiresVerification = true
  } else if (/debug|trace|log|stack|inspect|investigate/.test(lower)) {
    type = "debugging"
    complexity = 0.5
    requiresSearch = true
  } else if (/design|architecture|plan|structure|organi[sz]e/.test(lower)) {
    type = "architecture-design"
    complexity = 0.8
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/refactor|clean|restructure|simplify|deduplicate/.test(lower)) {
    type = "refactoring"
    complexity = 0.6
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/test|spec|coverage|assert|mock|jest|vitest/.test(lower)) {
    type = "testing"
    complexity = 0.5
    requiresVerification = true
  } else if (/doc|readme|document|comment|explain|describe/.test(lower)) {
    type = "documentation"
    complexity = 0.3
  } else if (/perform|optimise|optimize|slow|fast|latency|bottleneck/.test(lower)) {
    type = "performance-optimisation"
    complexity = 0.7
    requiresSearch = true
    requiresVerification = true
  } else if (/search|find|locate|where|lookup|discover/.test(lower)) {
    type = "repository-search"
    complexity = 0.2
    requiresSearch = true
  } else if (/dependenc|package\.json|cargo\.toml|module|import|require/.test(lower)) {
    type = "dependency-investigation"
    complexity = 0.4
    requiresDependencyGraph = true
  } else if (/secur|vulnerab|exploit|auth|permission|sanitize/.test(lower)) {
    type = "security-review"
    complexity = 0.8
    requiresSearch = true
    requiresDependencyGraph = true
    requiresVerification = true
  } else if (/generat|create|implement|build|add\s+(a|an|the)\s+(function|class|component|api|endpoint|route|controller|service|handler)/.test(lower)) {
    type = "code-generation"
    complexity = 0.5
  }

  return { type, complexity, requiresContext, requiresSearch, requiresDependencyGraph, requiresVerification }
}

const classifyRich: Interface["classifyRich"] = Effect.fn("TaskClassifier.classifyRich")(function* (input) {
  const signalTexts = input.signals.map((s) => ({ signal: s.signal, text: s.text.toLowerCase(), weight: s.weight }))

  // The current user prompt defines the primary task. Historical assistant/tool/project
  // context may add secondary classifications, but must never silently replace the
  // intent of the prompt being executed.
  const promptSignal = signalTexts.find((signal) => signal.signal === "prompt-text")
  const primary = classifyText(promptSignal?.text ?? signalTexts[0]?.text ?? "")

  const promptLength = promptSignal?.text.trim().length ?? 0
  const primaryConfidence = primary.type === "general-chat"
    ? 0.9
    : Math.min(0.95, 0.72 + Math.min(promptLength / 400, 0.18))

  const results: ClassificationResult[] = [{
    type: primary.type,
    confidence: primaryConfidence,
    signals: signalTexts.map((s) => ({ signal: s.signal, weight: s.weight })),
    complexity: primary.complexity,
    requiresContext: primary.requiresContext,
    requiresSearch: primary.requiresSearch,
    requiresDependencyGraph: primary.requiresDependencyGraph,
    requiresVerification: primary.requiresVerification,
  }]

  const secondaryMatches: Array<{ type: TaskType; confidence: number }> = []

  for (const st of signalTexts) {
    if (st.signal === "prompt-text") continue
    const candidate = classifyText(st.text)
    if (candidate.type !== primary.type && candidate.type !== "general-chat") {
      let conf = st.weight * 0.6
      if (st.text.length > 20) conf = Math.min(conf + 0.15, 0.95)
      secondaryMatches.push({ type: candidate.type, confidence: conf })
    }
  }

  const seen = new Set<string>([primary.type])
  for (const match of secondaryMatches) {
    if (!seen.has(match.type)) {
      seen.add(match.type)
      const signalInfo = signalTexts.map((s) => ({ signal: s.signal, weight: s.weight }))
      results.push({
        type: match.type,
        confidence: match.confidence,
        signals: signalInfo,
        complexity: classifyText(match.type).complexity,
        requiresContext: true,
        requiresSearch: true,
        requiresDependencyGraph: false,
        requiresVerification: true,
      })
    }
  }

  return results
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ classify, classifyRich })
  }),
)

export { layer }
