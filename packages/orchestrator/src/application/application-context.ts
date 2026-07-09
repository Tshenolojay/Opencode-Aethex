export * as ApplicationContext from "./application-context"

import { Context, Effect, Layer, Ref } from "effect"

export interface ApplicationContextSnapshot {
  readonly activeModules: readonly string[]
  readonly availableCapabilities: readonly string[]
  readonly connectedServices: readonly string[]
  readonly recentWorkflows: readonly string[]
  readonly currentWorkflow: string | undefined
  readonly environment: "development" | "staging" | "production" | "unknown"
  readonly timestamp: number
}

export interface Interface {
  readonly getSnapshot: () => Effect.Effect<ApplicationContextSnapshot>
  readonly setCurrentWorkflow: (workflowID: string) => Effect.Effect<void>
  readonly setEnvironment: (env: ApplicationContextSnapshot["environment"]) => Effect.Effect<void>
  readonly recordWorkflowUse: (workflowID: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ApplicationContext") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const currentWorkflow = yield* Ref.make<string | undefined>(undefined)
    const environment = yield* Ref.make<ApplicationContextSnapshot["environment"]>("unknown")
    const workflowHistory = yield* Ref.make<string[]>([])

    return Service.of({
      getSnapshot: Effect.fn("ApplicationContext.getSnapshot")(function* () {
        const cw = yield* Ref.get(currentWorkflow)
        const env = yield* Ref.get(environment)
        const history = yield* Ref.get(workflowHistory)
        return {
          activeModules: [],
          availableCapabilities: [],
          connectedServices: [],
          recentWorkflows: history.slice(-10),
          currentWorkflow: cw,
          environment: env,
          timestamp: Date.now(),
        }
      }),
      setCurrentWorkflow: Effect.fn("ApplicationContext.setCurrentWorkflow")(function* (workflowID) {
        yield* Ref.set(currentWorkflow, workflowID)
      }),
      setEnvironment: Effect.fn("ApplicationContext.setEnvironment")(function* (env) {
        yield* Ref.set(environment, env)
      }),
      recordWorkflowUse: Effect.fn("ApplicationContext.recordWorkflowUse")(function* (workflowID) {
        yield* Ref.update(workflowHistory, (h) => [...h, workflowID])
      }),
    })
  }),
)

export { layer }
