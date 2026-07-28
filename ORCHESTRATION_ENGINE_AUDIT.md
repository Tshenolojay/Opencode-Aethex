# Orchestration Engine Wiring Audit

**Updated:** 2026-07-28  
**Scope:** Orchestration integration completeness, confidence → specialist activation, and TUI sidebar/navbar wiring.

## Verdict

Hard/large prompts now correctly drive **low/medium confidence → specialist planning → ExecutionPackage → TUI**.  
Simple/high-confidence prompts bypass specialists.

## Fixed In This Pass

### Confidence scoring
- `ConfidenceEngine.estimate()` no longer divides by `factors.length ** factors.length` (always produced `"low"`).
- Level and score now share the same type×complexity-dominant formula.
- Thresholds come from `Config.minimumConfidence` / `Config.mediumConfidence`.

### Session / layer wiring
- `TaskClassifier`, `AgentDispatcher`, and `ModelSelector` are in the orchestrator Tier 0 stack.
- Core session uses `Layer.provideMerge` so classifier/confidence/dispatcher stay in runtime context (previously `Layer.provide` dropped them and orchestration silently no-oped via `Effect.option`).
- High confidence bypasses **before** specialist planning/execution.
- Low confidence forces specialist matches via policy + capability/task-type fallbacks.

### Specialist activation
- Planning honors `policy.requiresSpecialists` / `maxSpecialists`.
- `SpecialistExecutor` lazily loads executable specialist factories (search, repository, planning, …) and falls back to model assignment when needed.
- Finalization always writes planned specialists into the `ExecutionPackage` so the TUI can show them even if late runtime tiers are deferred.

### TUI
- Right sidebar: confidence color, factors, specialist roles/status, orchestrating vs bypassed.
- Navbar: live confidence + specialist count.
- Left sidebar: active session highlight, low-confidence marker, orchestrator status strip.
- Sync consumes fine-grained `execution.*` events in addition to `execution.package.updated`.

### Public contract
- `ExecutionPackage` adds optional `needsOrchestration`, `confidenceFactors`, and specialist `status`.

## Flow (hard prompt)

1. `SessionV2.prompt` wakes execution and calls `SessionIntegration.integrate`.
2. Foundation classifies + scores confidence.
3. Low/medium confidence → planning selects specialists + dispatch plan.
4. Package summary exposes specialists/roles/status to API/TUI.
5. Right sidebar + navbar update live from sync events.

## Remaining Adjacent Gaps

- Late Effect tiers (`RuntimeManager`, `LearningEngine`, `ReasoningBuilder`) still do not always cross-merge into the process context; stages degrade gracefully and keep the specialist plan.
- File mutation / bash background-job V2 follow-ups remain deferred (unchanged).
- `packages/orchestrator/package-temp.json` leftover is harmless noise.
