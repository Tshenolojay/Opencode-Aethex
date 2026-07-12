export * as TaskDecomposer from "./task-decomposer"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { TaskGraph, TaskUnit, TaskCategory } from "../integration/execution-package"

export interface Interface {
  readonly decompose: (pkg: ExecutionPackage) => Effect.Effect<TaskGraph>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/TaskDecomposer") {}

const decompose: Interface["decompose"] = Effect.fn("TaskDecomposer.decompose")(function* (pkg) {
  const classification = pkg.taskClassification
  const units: TaskUnit[] = []
  let seq = 0
  const add = (title: string, category: TaskCategory, complexity: number, dependencies: string[], caps: readonly string[]) => {
    seq++
    units.push({ id: `task-${seq}`, title, category, complexity, dependencies, parallelGroup: undefined, requiredCapabilities: caps })
  }

  add("Repository Analysis", "repository-analysis", 2, [], ["repository-understanding"])
  if (classification.requiresDependencyGraph) add("Dependency Analysis", "dependency-analysis", 2, ["task-1"], ["search", "analysis"])
  if (classification.requiresContext || pkg.architectureIntelligence) add("Architecture Review", "architecture-review", 3, ["task-1"], ["repository-understanding", "analysis"])
  if (classification.requiresVerification) add("Verification", "verification", 4, ["task-1"], ["analysis", "tool-use"])
  if (classification.requiresSearch || pkg.knowledgeBundle.relevantFiles.length > 0) add("Documentation", "documentation", 2, ["task-1"], ["search", "long-context"])
  add("Planning", "planning", classification.complexity, [], ["planning", "reasoning"])
  if (classification.type === "refactoring" || classification.type === "code-generation") {
    add("Refactoring", "refactoring", classification.complexity + 2, ["task-2", "task-3"].filter((d) => units.some((u) => u.id === d)), ["code-generation", "analysis"])
  }

  const dependencies = units.flatMap((u) => u.dependencies.map((d) => ({ from: d, to: u.id })))
  const parallelGroups = units
    .filter((u) => u.dependencies.length === 0)
    .map((u) => [u.id] as readonly string[])
  const estimatedComplexity = units.reduce((acc, u) => acc + u.complexity, 0)

  return { units, dependencies, parallelGroups, estimatedComplexity }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ decompose })
  }),
)

export { layer }
