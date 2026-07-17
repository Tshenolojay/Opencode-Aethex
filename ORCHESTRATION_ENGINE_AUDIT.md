# Orchestration Engine Wiring Audit

**Generated:** 2026-07-16
**Scope:** Static audit of the orchestration engine wiring in `packages/orchestrator` plus the runtime entrypoints in `packages/core` and `packages/opencode`.
**Method:** Source inspection only. No code changes, builds, or tests were required for this report.

## Verdict

The orchestration engine itself appears wired end to end through the main runtime path.

I did **not** find an orphaned public orchestrator entrypoint or an unconsumed pipeline layer in the engine core. The incomplete pieces I found are adjacent V2 tool and mutation integrations that are deliberately deferred, not a broken orchestration dispatch chain.

## Wiring Confirmed

- [`packages/orchestrator/src/index.ts`](./packages/orchestrator/src/index.ts) exports the engine surface, including [`OrchestratorService`](./packages/orchestrator/src/orchestrator.ts) and the major subsystem namespaces.
- [`packages/orchestrator/src/orchestrator.ts`](./packages/orchestrator/src/orchestrator.ts#L1) composes the classifier, confidence, selector, planner, executor, runtime, intelligence, application, team, connector, collaboration, learning, and integration layers into the orchestration service.
- [`packages/orchestrator/src/session-integration.ts`](./packages/orchestrator/src/session-integration.ts#L1) turns `orchestrateWithContext(...)` into an `ExecutionDecision` and `ExecutionPackage`.
- [`packages/core/src/session.ts`](./packages/core/src/session.ts#L37) imports `SessionIntegration` and `OrchestratorService`, then provides them on the session layer and calls `service.integrate(...)` before session execution continues.
- [`packages/opencode/src/cli/cmd/run/runtime.ts`](./packages/opencode/src/cli/cmd/run/runtime.ts#L1) is the CLI/TUI runtime entrypoint that hosts the session loop on top of the core session stack.

## Incomplete Or Adjacent Surfaces

### File mutation is functional, but the downstream integrations are still deferred

The write/edit/mutation path works, but the follow-up observability and recovery hooks are still explicitly marked as TODOs:

- [`packages/core/src/tool/write.ts`](./packages/core/src/tool/write.ts#L41) still defers formatter integration, watcher/file-edit events, snapshots/undo, and LSP notifications/diagnostics.
- [`packages/core/src/tool/edit.ts`](./packages/core/src/tool/edit.ts#L83) has the same deferred follow-ups, plus fuzzy-correction strategies that are intentionally not reintroduced yet.
- [`packages/core/src/file-mutation.ts`](./packages/core/src/file-mutation.ts#L198) repeats the same deferred V2 integrations and adds multi-file rollback and crash-recovery TODOs.

Impact:
- file write/edit works
- orchestration can still request the tools
- the surrounding “observe, recover, replay, and roll back” story is not fully wired end to end yet

### Bash/background-job orchestration is intentionally partial

[`packages/core/src/tool/bash.ts`](./packages/core/src/tool/bash.ts#L62) still defers:

- parser-based approval reduction
- Windows-specific shell parity
- durable live progress streaming
- background job persistence and restart recovery
- HTTP observation of background jobs

Impact:
- the shell tool is usable
- the durable job supervision path is not complete yet

### Stale temp artifact

[`packages/orchestrator/package-temp.json`](./packages/orchestrator/package-temp.json#L1) is a leftover snapshot manifest with no live references in the repo.

Impact:
- not part of runtime wiring
- harmless to the app, but noisy for audits and easy to confuse with a real package manifest

## Bottom Line

The orchestration engine is wired through the main runtime path and does not appear to have a broken end-to-end control flow.

The incomplete code I found is concentrated in adjacent V2 tool/mutation plumbing that is deliberately deferred:

- file-edit follow-ups
- shell/background-job follow-ups
- one stale manifest snapshot

If you want the next step, the clean-up target is the deferred V2 integration backlog, not the orchestration engine dispatch path itself.
