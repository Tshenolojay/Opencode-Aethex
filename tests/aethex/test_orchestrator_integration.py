from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def source(path: str) -> str:
    target = ROOT / path
    assert target.is_file(), f"missing integration source: {path}"
    return target.read_text(encoding="utf-8")


def test_orchestrator_is_an_additive_session_hook() -> None:
    session = source("packages/core/src/session.ts")
    assert "SessionIntegration.Service" in session
    assert "integration.value" in session
    assert ".integrate({" in session
    assert "Flag.OPENCODE_DISABLE_ORCHESTRATOR" in session
    assert "execution.wake(input.sessionID)" in session
    assert session.index("integration.value") < session.index("execution.wake(input.sessionID)")


def test_high_confidence_bypass_is_prompt_transparent() -> None:
    context = source("packages/core/src/system-context/orchestration.ts")
    assert "if (!pkg.needsOrchestration) return undefined" in context
    assert "specialists bypassed" not in context


def test_real_v2_task_tool_uses_existing_opencode_session_runner() -> None:
    task = source("packages/core/src/tool/task.ts")
    required = [
        'export const name = "task"',
        "SessionV1.Event.Created",
        "parentID: context.sessionID",
        "SessionInput.admit(db, events",
        "runner.run({ sessionID: child.id, force: true })",
        'status: "running"',
        'status: "executed"',
        'status: "failed"',
        "SessionRunnerLLM.node",
    ]
    for needle in required:
        assert needle in task
    assert "SessionRunner.node" not in task


def test_orchestration_specialists_are_registered_subagents_without_recursive_task_dispatch() -> None:
    agents = source("packages/core/src/plugin/agent.ts")
    for specialist in (
        "search",
        "repository",
        "dependency",
        "documentation",
        "architecture",
        "verification",
        "context",
        "planning",
    ):
        assert re.search(rf'id:\s*"{specialist}"', agents)
    assert 'item.mode = "subagent"' in agents
    assert '{ action: "task", resource: "*", effect: "deny" }' in agents


def test_live_runtime_catalog_bridge_is_session_isolated() -> None:
    session = source("packages/core/src/session.ts")
    catalog = source("packages/orchestrator/src/catalog.ts")
    selector = source("packages/orchestrator/src/resources/selection-engine.ts")
    orchestrator = source("packages/orchestrator/src/orchestrator.ts")

    assert "const runtimeCatalog =" in session
    assert "Catalog.Service" in session
    assert "runtimeCatalog," in session
    assert "FiberRef.make<RuntimeCatalogSnapshot>" in catalog
    assert "catalog.replace(input.runtimeCatalog)" in orchestrator
    assert "modelCatalog.availableModels()" in selector
    assert "providerCatalog.availableProviders()" in selector


def test_session_runner_observer_is_inert_without_aethex_package() -> None:
    runner = source("packages/core/src/session/runner/llm.ts")
    observer = runner.index("const currentExecutionPackage = getExecutionPackage(session.id)")
    guard = runner.index("if (currentExecutionPackage)", observer)
    update = runner.index("setExecutionPackage(session.id, modelExecutionPackage)", guard)
    assert observer < guard < update


def test_execution_completion_is_published_at_the_real_runner_boundary() -> None:
    runner = source("packages/core/src/session/runner/llm.ts")
    assert 'const publishExecutionStatus = Effect.fn("SessionRunner.publishExecutionStatus")' in runner
    assert "executeRun(input).pipe(" in runner
    assert "Effect.onExit((exit) =>" in runner
    assert "events.publish(ExecutionPackageContract.ExecutionCompleted" in runner
    assert runner.index("events.publish(ExecutionPackageContract.ExecutionCompleted") > runner.index(
        'const publishExecutionStatus = Effect.fn("SessionRunner.publishExecutionStatus")'
    )


def test_pipeline_streams_live_stage_snapshots_to_ui_state() -> None:
    pipeline = source("packages/orchestrator/src/pipeline/pipeline.ts")
    session = source("packages/core/src/session.ts")
    assert "PipelineProgressHandler" in pipeline
    assert "emitProgress(onProgress" in pipeline
    for stage in (
        "foundation",
        "planning",
        "resource-management",
        "specialist-execution",
        "intelligence",
        "reasoning",
        "collaboration",
        "finalization",
    ):
        assert stage in pipeline
    assert 'status: progressInfo.status === "bypassed" ? "bypassed" : progress.stage' in session


def test_knowledge_panel_uses_executed_child_agent_evidence_only() -> None:
    integration = source("packages/orchestrator/src/session-integration.ts")
    task = source("packages/core/src/tool/task.ts")
    for field in (
        "repositoryIntelligence",
        "architectureSummary",
        "dependencySummary",
        "documentationSummary",
        "verificationSummary",
    ):
        assert f"{field}: undefined" in integration
        assert field in task
    assert "resultText: text" in task


def test_planning_advice_only_names_real_v2_tools() -> None:
    advisor = source("packages/orchestrator/src/intelligence/execution-advisor.ts")
    for tool in ('"glob"', '"grep"', '"read"', '"bash"', '"task"'):
        assert tool in advisor
    for fictional in ('"dependency-graph"', '"run-tests"', '"bulk-edit"'):
        assert fictional not in advisor


def test_tui_distinguishes_planned_running_and_executed_state() -> None:
    execution = source("packages/tui/src/feature-plugins/sidebar/orchestrator-execution.tsx")
    specialists = source("packages/tui/src/feature-plugins/sidebar/orchestrator-specialists.tsx")
    models = source("packages/tui/src/feature-plugins/sidebar/orchestrator-models.tsx")
    knowledge = source("packages/tui/src/feature-plugins/sidebar/orchestrator-knowledge.tsx")
    planning = source("packages/tui/src/feature-plugins/sidebar/orchestrator-planning.tsx")
    navbar = source("packages/tui/src/routes/session/navbar.tsx")
    left = source("packages/tui/src/routes/session/left-sidebar.tsx")

    combined = "\n".join((execution, specialists, models, knowledge, planning, navbar, left))
    assert "Ready —" not in combined
    assert "services active" not in combined
    assert "Active runtime model" in models
    assert "Routing candidate" in models
    assert "No collected knowledge summary yet" in knowledge
    assert "No planning output yet" in planning
    assert "spec pending" in navbar
    assert "pipeline stages" in left
