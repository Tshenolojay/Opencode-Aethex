export * as WorkflowIntelligence from "./workflow-intelligence"

import { Context, Effect, Layer } from "effect"
import { ApplicationWorkflows, type BusinessWorkflow, type WorkflowCategory } from "./application-workflows"

export interface WorkflowBottleneck {
  readonly workflowID: string
  readonly stepIndex: number
  readonly issue: string
  readonly impact: number
}

export interface WorkflowOptimization {
  readonly workflowID: string
  readonly suggestion: string
  readonly expectedImprovement: string
  readonly effort: "low" | "medium" | "high"
}

export interface WorkflowAnalysis {
  readonly workflows: readonly BusinessWorkflow[]
  readonly bottlenecks: readonly WorkflowBottleneck[]
  readonly optimizations: readonly WorkflowOptimization[]
  readonly reusableWorkflows: readonly BusinessWorkflow[]
  readonly automationOpportunities: readonly string[]
  readonly workflowDependencies: readonly string[]
}

export interface Interface {
  readonly analyze: () => Effect.Effect<WorkflowAnalysis>
  readonly findBottlenecks: () => Effect.Effect<readonly WorkflowBottleneck[]>
  readonly suggestOptimizations: () => Effect.Effect<readonly WorkflowOptimization[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/WorkflowIntelligence") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const workflows = yield* ApplicationWorkflows.Service

    const analyze: Interface["analyze"] = Effect.fn("WorkflowIntelligence.analyze")(function* () {
      const all = yield* workflows.getWorkflows()

      const bottlenecks: WorkflowBottleneck[] = all
        .filter((w) => w.estimatedComplexity > 0.6)
        .map((w) => ({
          workflowID: w.id,
          stepIndex: w.steps.length - 1,
          issue: `Complex workflow (${w.estimatedComplexity})`,
          impact: 0.5,
        }))

      const optimizations: WorkflowOptimization[] = all
        .filter((w) => w.steps.length > 4)
        .map((w) => ({
          workflowID: w.id,
          suggestion: `Simplify ${w.name} workflow`,
          expectedImprovement: "Reduce steps and complexity",
          effort: w.steps.length > 6 ? "high" : "medium" as const,
        }))

      const reusable = all.filter((w) => w.estimatedComplexity <= 0.5)

      return {
        workflows: all,
        bottlenecks,
        optimizations,
        reusableWorkflows: reusable,
        automationOpportunities: all
          .filter((w) => w.category === "business" || w.category === "approval")
          .map((w) => w.name),
        workflowDependencies: all.flatMap((w) => w.requiredCapabilities),
      }
    })

    return Service.of({
      analyze,
      findBottlenecks: Effect.fn("WorkflowIntelligence.findBottlenecks")(function* () {
        const result = yield* analyze()
        return result.bottlenecks
      }),
      suggestOptimizations: Effect.fn("WorkflowIntelligence.suggestOptimizations")(function* () {
        const result = yield* analyze()
        return result.optimizations
      }),
    })
  }),
)

export { layer }
