export * as CollaborationPolicy from "./collaboration-policy"

import { Context, Effect, Layer } from "effect"
import type { CollaborationPolicyType } from "../integration/collaboration-result"
import type { ExecutionPackage } from "../integration/execution-package"

export interface PolicyProfile {
  readonly type: CollaborationPolicyType
  readonly name: string
  readonly description: string
  readonly maxRounds: number
  readonly requirePeerReview: boolean
  readonly requireConsensus: boolean
  readonly prioritizeVerification: boolean
}

export const POLICIES: Record<CollaborationPolicyType, PolicyProfile> = {
  "fastest-consensus": {
    type: "fastest-consensus", name: "Fastest Consensus",
    description: "Reach a quick advisory consensus with minimal rounds",
    maxRounds: 1, requirePeerReview: false, requireConsensus: true, prioritizeVerification: false,
  },
  "highest-confidence": {
    type: "highest-confidence", name: "Highest Confidence",
    description: "Maximize confidence through deeper review and consensus",
    maxRounds: 3, requirePeerReview: true, requireConsensus: true, prioritizeVerification: true,
  },
  "maximum-verification": {
    type: "maximum-verification", name: "Maximum Verification",
    description: "Emphasize verification specialist review before consensus",
    maxRounds: 3, requirePeerReview: true, requireConsensus: true, prioritizeVerification: true,
  },
  "architecture-first": {
    type: "architecture-first", name: "Architecture First",
    description: "Prioritize architecture specialist input",
    maxRounds: 2, requirePeerReview: true, requireConsensus: true, prioritizeVerification: false,
  },
  "repository-first": {
    type: "repository-first", name: "Repository First",
    description: "Prioritize repository specialist findings",
    maxRounds: 2, requirePeerReview: false, requireConsensus: true, prioritizeVerification: false,
  },
  "documentation-first": {
    type: "documentation-first", name: "Documentation First",
    description: "Prioritize documentation specialist review",
    maxRounds: 2, requirePeerReview: false, requireConsensus: true, prioritizeVerification: false,
  },
  balanced: {
    type: "balanced", name: "Balanced",
    description: "Balance speed, confidence and verification",
    maxRounds: 2, requirePeerReview: true, requireConsensus: true, prioritizeVerification: true,
  },
  "cost-optimized": {
    type: "cost-optimized", name: "Cost Optimized",
    description: "Minimize collaboration overhead",
    maxRounds: 1, requirePeerReview: false, requireConsensus: true, prioritizeVerification: false,
  },
  "latency-optimized": {
    type: "latency-optimized", name: "Latency Optimized",
    description: "Minimize collaboration latency",
    maxRounds: 1, requirePeerReview: false, requireConsensus: false, prioritizeVerification: false,
  },
  "planning-intensive": {
    type: "planning-intensive", name: "Planning Intensive",
    description: "Emphasize planning specialist collaboration",
    maxRounds: 3, requirePeerReview: true, requireConsensus: true, prioritizeVerification: true,
  },
}

export interface Interface {
  readonly recommend: (pkg: ExecutionPackage) => Effect.Effect<CollaborationPolicyType>
  readonly getPolicy: (type: CollaborationPolicyType) => PolicyProfile | undefined
  readonly allPolicies: () => readonly PolicyProfile[]
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CollaborationPolicy") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const recommend: Interface["recommend"] = Effect.fn("CollaborationPolicy.recommend")(function* (pkg) {
      const type = pkg.taskClassification?.type ?? "general-chat"
      const complexity = pkg.taskClassification?.complexity ?? 0
      const confidence = pkg.confidence ?? "high"

      if (confidence === "high" && (type === "general-chat" || type === "repository-search")) {
        return "latency-optimized"
      }
      if (type === "testing" || type === "security-review") return "maximum-verification"
      if (type === "architecture-design") return "architecture-first"
      if (type === "repository-search" || type === "refactoring") return "repository-first"
      if (type === "documentation") return "documentation-first"
      if ((type as string) === "planning") return "planning-intensive"
      if (type === "code-generation" || type === "debugging" || type === "bug-fix") return "highest-confidence"
      if (complexity > 0.8) return "balanced"
      if (confidence === "low") return "highest-confidence"
      return "balanced"
    })

    return Service.of({
      recommend,
      getPolicy: (type) => POLICIES[type],
      allPolicies: () => Object.values(POLICIES),
    })
  }),
)

export { layer }
