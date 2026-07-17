<p align="center">
  <a href="https://github.com/Tshenolojay/Opencode-Aethex">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode Aethex logo">
    </picture>
  </a>
</p>
<p align="center">The AI coding agent with intelligent task orchestration.</p>
<p align="center">
  <a href="https://github.com/Tshenolojay/Opencode-Aethex">OpenCode Aethex</a> is a
  <a href="https://github.com/anomalyco/opencode">OpenCode</a> fork enhanced with a task-level orchestration layer.
</p>

---

## What is OpenCode Aethex?

OpenCode Aethex is an AI development platform built on [OpenCode](https://github.com/anomalyco/opencode) and extended with an **Orchestration Engine** — an intelligent layer that decides *how* a task should be done before any agent runs.

For every prompt it:

1. **Classifies** the task (type, complexity, what capabilities it needs).
2. **Estimates confidence** — if confidence is high, the task skips orchestration and runs directly.
3. **Plans capabilities** required and matches them to **specialist agents**.
4. **Builds a dispatch / execution plan** and **augments the prompt** with the knowledge those specialists need.

This lets complex work route itself to the right agents and models automatically, while simple work stays fast.

## Installation

```bash
# Prerequisites: Bun (https://bun.sh) and Node 20+
git clone https://github.com/Tshenolojay/Opencode-Aethex.git
cd Opencode-Aethex
bun install
bun turbo build

# Run the agent from a project directory
bun run --cwd packages/opencode opencode-aethex
```

OpenCode Aethex is built from this repository and includes the orchestration engine compiled into every binary. Upstream OpenCode install methods (`brew`, `npm i -g opencode-ai`, etc.) install the base agent without orchestration — use the build above for the full experience.

> **Tip:** Remove OpenCode versions older than `0.1.x` before installing.

### Desktop App

Desktop builds are available from the
[releases page](https://github.com/Tshenolojay/Opencode-Aethex/releases).

## Orchestration Engine

The engine lives in **`packages/orchestrator`** (`@opencode-ai/orchestrator`) and is described as:

> *Intelligent orchestration layer for OpenCode Aethex — task classification, confidence estimation, agent dispatch, and prompt augmentation.*

### The `orchestrate` flow

`OrchestratorService.orchestrate(input)` runs a pipeline:

| Stage | Layer | Responsibility |
| --- | --- | --- |
| Task classification | `classifier` | Classify prompt into a task type + complexity + required signals |
| Confidence estimation | `confidence` | Estimate confidence; **high confidence → skip orchestration** |
| Capability estimation | `selector` (`model`) | Estimate required model/agent capabilities |
| Capability planning | `planner` | Plan the capabilities the task needs |
| Specialist matching | `specialists` | Match registered specialists to required capabilities |
| Planning policy | `planner` | Evaluate limits (e.g. max specialists) |
| Dispatch planning | `dispatcher` | Plan which agents to dispatch and what context they need |
| Knowledge planning | `planner` / `knowledge` | Plan the knowledge bundle (search / context / dependency / verification) |

The result is an `OrchestrationDecision`: whether orchestration is needed, the task classification, the confidence score, the dispatch plan, the capability plan, the knowledge plan, and the specialist plan.

A richer entry point, `orchestrateWithContext`, runs the full multi-stage pipeline (`pipeline/runAllStages`) and returns timing/diagnostics, an execution graph, and an `ExecutionPackage`.

### Architecture (layered)

The engine is organized as composable Effect layers. The major subsystems:

- **`classifier`** — task classification (`TaskClassifier`, classification schema).
- **`confidence`** — confidence estimation that gates whether orchestration runs at all.
- **`dispatcher`** — agent dispatch planning (`AgentDispatcher`).
- **`selector` / `model`** — model & provider selection: capability registry/discovery, provider & model ranking, selection cache/policies, profiles, health, cost/latency/context estimators, fallback & execution strategy, provider adapters.
- **`planner`** — capability planning, knowledge planning, planning policy, planning memory, execution-graph building.
- **`specialists`** — specialist registry and runner.
- **`execution`** — model assignment, context building, specialist execution, execution scheduling, failure recovery.
- **`knowledge`** — knowledge bundles and collection/merging.
- **`runtime`** — runtime manager, context, cache, validator, fallback.
- **`prompts`** — prompt building.
- **`intelligence`** — repository, context, dependency, documentation, architecture, and verification intelligence; knowledge validation; ranking; execution advising; context compression.
- **`reasoning`** — reasoning building, specialist consensus, execution narrative, decision engine, reasoning memory.
- **`team`** — virtual team, task decomposition, work allocation, team coordination, shared workspace, team discussion, review pipeline, capability marketplace.
- **`connectors`** — connector coordination and knowledge/repository/documentation/conversation/tool-history connectors + knowledge-source registry.
- **`collaboration`** — collaboration policy, consensus engine, conflict resolution, discussion moderation, peer review, shared workspace, specialist coordination, scoreboard/memory, review management, collaboration sessions.
- **`learning`** — learning engine, decision history, strategy evaluation, workflow/confidence/planning learning, knowledge/execution feedback, learning metrics.
- **`application`** — application-level modules: profile, registry, analyzer, capabilities, workflows, services, connectors, context, discovery, intelligence, memory, summary, health, metrics, plus domain / business / workflow / feature / module / service / organization / integration intelligence.
- **`views`** — TUI views: execution summary, repository, architecture, dependency, documentation, verification, reasoning, planning, workflow, connector.
- **`integration`** — the boundary that makes orchestration usable by the agent: `ExecutionPackage` builder, agent context, agent hints, agent capabilities, agent-selection advice, prompt augmentation, agent enhancer, and agent adapter.

### Integration points

The engine is wired into the runtime: `packages/core/src/session.ts` provides `SessionIntegration` (and its `OrchestratorService` dependency) onto the global Session node and invokes it on every prompt via `SessionIntegration.integrate`. On **high confidence** the session runs normally (the orchestrator is transparent); on **low confidence** the orchestrator evaluates and produces an `ExecutionPackage`. Set `OPENCODE_DISABLE_ORCHESTRATOR` to bypass the engine entirely.

The engine is designed to plug into the agent rather than replace it. Key integration surfaces (`packages/orchestrator/src/integration`):

- **`ExecutionPackage`** — the structured package describing what should run (capabilities, specialists, knowledge requirements).
- **`AgentContext` / `AgentHints` / `AgentCapabilities`** — context, hints, and capability advice handed to agents.
- **`PromptAugmentation`** — augments the prompt with the planned knowledge.
- **`AgentAdapter`** — adapts orchestration output to the agent runtime.

## Agents

OpenCode Aethex includes two built-in agents you can switch between with the `Tab` key:

- **build** — Default, full-access agent for development work.
- **plan** — Read-only agent for analysis and code exploration (denies edits, asks before bash).

A **general** subagent handles complex searches and multi-step tasks (invoke with `@general`).

Learn more in the [OpenCode agent docs](https://opencode.ai/docs/agents).

## Documentation

Core documentation: [opencode.ai/docs](https://opencode.ai/docs).
For contributing, read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Status

This repository carries the full OpenCode history (forked) with the Orchestration Engine developed on the `orchestration-engine` branch and merged into `main`. The engine is actively developed under `packages/orchestrator`.

## Feedback & Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/Tshenolojay/Opencode-Aethex/issues) on GitHub. Your feedback helps us improve OpenCode Aethex.

---

**Community:** [Discord](https://discord.gg/opencode) · [X.com](https://x.com/opencode)
