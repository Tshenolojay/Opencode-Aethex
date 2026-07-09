import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ApplicationProfile } from "../src/application/application-profile"
import { ApplicationAnalyzer } from "../src/application/application-analyzer"
import { ApplicationCapabilities } from "../src/application/application-capabilities"
import { ApplicationWorkflows } from "../src/application/application-workflows"
import { ApplicationServices } from "../src/application/application-services"
import { ApplicationDiscovery } from "../src/application/application-discovery"
import { ApplicationIntelligence } from "../src/application/application-intelligence"

const layer = Layer.mergeAll(
  ApplicationProfile.layer,
  ApplicationAnalyzer.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
  ApplicationCapabilities.layer,
  ApplicationWorkflows.layer,
  ApplicationServices.layer,
  ApplicationDiscovery.layer.pipe(Layer.provideMerge(ApplicationProfile.layer)),
  ApplicationIntelligence.layer,
)
const run = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)))

test("generateReport returns full intelligence report", async () => {
  const report = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "SmartApp",
        version: "2.0.0",
        applicationType: "web",
        businessDomain: "fintech",
        modules: [{ name: "PayModule", description: "Payments", enabled: true }],
        capabilities: ["commerce", "analytics"],
        supportedWorkflows: ["order-processing"],
        permissions: [],
        executionBoundaries: [],
      })
      const svc = yield* ApplicationIntelligence.Service
      return yield* svc.generateReport()
    }),
  )
  expect(report.application.name).toBe("SmartApp")
  expect(report.application.version).toBe("2.0.0")
  expect(report.application.applicationType).toBe("web")
  expect(report.application.businessDomain).toBe("fintech")
  expect(report.application.moduleCount).toBe(1)
  expect(report.application.capabilityCount).toBe(2)
  expect(report.application.workflowCount).toBe(1)
  expect(report.business.domain).toBe("fintech")
  expect(report.business.primaryProcesses).toContain("order-processing")
  expect(report.workflows.totalWorkflows).toBeGreaterThanOrEqual(8)
  expect(report.capabilities.totalCapabilities).toBeGreaterThanOrEqual(14)
  expect(report.modules.totalModules).toBe(1)
  expect(report.analysis).toBeDefined()
  expect(report.timestamp).toBeGreaterThan(0)
})

test("generateReport with no profile uses defaults", async () => {
  const report = await run(
    Effect.gen(function* () {
      const svc = yield* ApplicationIntelligence.Service
      return yield* svc.generateReport()
    }),
  )
  expect(report.application.name).toBe("unknown")
  expect(report.application.applicationType).toBe("unknown")
  expect(report.application.businessDomain).toBe("general")
  expect(report.application.moduleCount).toBe(0)
})

test("getApplicationSummary", async () => {
  const summary = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "TestApp",
        version: "3.0.0",
        applicationType: "desktop",
        businessDomain: "productivity",
        modules: [{ name: "M1", description: "", enabled: true }],
        capabilities: ["planning"],
        supportedWorkflows: ["planning"],
        permissions: [],
        executionBoundaries: [],
      })
      const svc = yield* ApplicationIntelligence.Service
      return yield* svc.getApplicationSummary()
    }),
  )
  expect(summary.name).toBe("TestApp")
  expect(summary.version).toBe("3.0.0")
  expect(summary.applicationType).toBe("desktop")
  expect(summary.businessDomain).toBe("productivity")
  expect(summary.moduleCount).toBe(1)
})

test("getBusinessSummary", async () => {
  const summary = await run(
    Effect.gen(function* () {
      const profile = yield* ApplicationProfile.Service
      yield* profile.register({
        name: "BizApp",
        version: "1.0.0",
        applicationType: "web",
        businessDomain: "ecommerce",
        modules: [],
        capabilities: ["commerce"],
        supportedWorkflows: ["order-processing", "inventory-sync"],
        permissions: [],
        executionBoundaries: ["payment-gateway"],
      })
      const svc = yield* ApplicationIntelligence.Service
      return yield* svc.getBusinessSummary()
    }),
  )
  expect(summary.domain).toBe("ecommerce")
  expect(summary.primaryProcesses).toContain("order-processing")
  expect(summary.primaryProcesses).toContain("inventory-sync")
  expect(summary.integrationPoints).toContain("payment-gateway")
})
