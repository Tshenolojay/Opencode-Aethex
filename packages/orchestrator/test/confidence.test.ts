import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { ConfidenceEngine, scoreToLevel } from "../src/confidence/confidence"
import { Config } from "../src/pipeline/orchestrator-config"

const classification = {
  type: "general-chat" as const,
  complexity: 0.2,
  requiresContext: true,
  requiresSearch: false,
  requiresDependencyGraph: false,
  requiresVerification: false,
  confidence: "high" as const,
}

describe("ConfidenceEngine", () => {
  test("scoreToLevel uses configurable thresholds", () => {
    expect(scoreToLevel(Config.minimumConfidence)).toBe("high")
    expect(scoreToLevel(Config.mediumConfidence)).toBe("medium")
    expect(scoreToLevel(Config.mediumConfidence - 0.01)).toBe("low")
  })

  test("estimate and estimateWithScore agree on level", async () => {
    const program = Effect.gen(function* () {
      const confidence = yield* ConfidenceEngine.Service
      const input = {
        classification,
        repositorySize: 100,
        conversationLength: 2,
        filesAttached: 0,
        promptComplexity: 0.2,
        contextAvailable: true,
        previousToolResults: false,
      }
      const level = yield* confidence.estimate(input)
      const scored = yield* confidence.estimateWithScore({
        ...input,
        classifications: [],
        sessionMetadata: undefined,
        toolHistory: undefined,
      })
      expect(level).toBe(scored.level)
      expect(scored.score).toBeGreaterThan(0.3)
      expect(scored.score).toBeLessThanOrEqual(1.2)
      return scored
    })

    const scored = await Effect.runPromise(program.pipe(Effect.provide(ConfidenceEngine.layer)))
    expect(scored.level).toBe("high")
  })

  test("confidence factors are bounded and runtime evidence increases confidence", async () => {
    const program = Effect.gen(function* () {
      const confidence = yield* ConfidenceEngine.Service
      const sparse = yield* confidence.estimateWithScore({
        classification,
        repositorySize: 0,
        conversationLength: 2,
        filesAttached: 0,
        promptComplexity: 0.2,
        contextAvailable: false,
        previousToolResults: false,
        classifications: [{ type: "general-chat", confidence: 0.9 }],
        sessionMetadata: undefined,
        toolHistory: undefined,
      })
      const grounded = yield* confidence.estimateWithScore({
        classification,
        repositorySize: 120,
        conversationLength: 2,
        filesAttached: 1,
        promptComplexity: 0.2,
        contextAvailable: true,
        previousToolResults: true,
        classifications: [{ type: "general-chat", confidence: 0.9 }],
        sessionMetadata: { branch: "main" },
        toolHistory: ["tests passed"],
      })
      return { sparse, grounded }
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(ConfidenceEngine.layer)))
    expect(result.sparse.factors.every((factor) => factor.value >= 0 && factor.value <= 1)).toBe(true)
    expect(result.grounded.factors.every((factor) => factor.value >= 0 && factor.value <= 1)).toBe(true)
    expect(result.grounded.score).toBeGreaterThan(result.sparse.score)
  })

  test("low confidence for complex architecture tasks", async () => {
    const program = Effect.gen(function* () {
      const confidence = yield* ConfidenceEngine.Service
      return yield* confidence.estimateWithScore({
        classification: {
          type: "architecture-design",
          complexity: 0.9,
          requiresContext: true,
          requiresSearch: true,
          requiresDependencyGraph: true,
          requiresVerification: true,
          confidence: "low",
        },
        repositorySize: 50000,
        conversationLength: 40,
        filesAttached: 0,
        promptComplexity: 0.9,
        contextAvailable: false,
        previousToolResults: false,
        classifications: [
          { type: "architecture-design", confidence: 0.6 },
          { type: "refactoring", confidence: 0.4 },
        ],
        sessionMetadata: undefined,
        toolHistory: undefined,
      })
    })

    const scored = await Effect.runPromise(program.pipe(Effect.provide(ConfidenceEngine.layer)))
    expect(scored.level).toBe("low")
    expect(scored.score).toBeLessThan(Config.mediumConfidence)
  })
})
