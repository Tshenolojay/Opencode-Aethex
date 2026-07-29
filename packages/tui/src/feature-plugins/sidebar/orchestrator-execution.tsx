import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, For, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-execution"

function Row(props: { label: string; value: string | undefined; theme: () => any; color?: string }) {
  return (
    <Show when={props.value}>
      <text fg={props.theme().textMuted}>
        {props.label}: <span fg={props.color ?? props.theme().text}>{props.value}</span>
      </text>
    </Show>
  )
}

function confidenceColor(level: string | undefined, theme: () => any) {
  if (level === "high") return theme().success
  if (level === "medium") return theme().warning
  if (level === "low") return theme().error
  return theme().text
}

function statusColor(status: string | undefined, theme: () => any) {
  if (status === "completed" || status === "bypassed") return theme().success
  if (status === "orchestrating" || status === "busy") return theme().warning
  return theme().textMuted
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const pkg = createMemo(() => props.api.state.session.execution_package(props.session_id))
  const score = createMemo(() => {
    const value = pkg()?.confidenceScore
    if (value === undefined) return undefined
    return `${Math.round(Number(value) * 100)}%`
  })
  const phases = createMemo(() => pkg()?.phases ?? [])
  const activity = createMemo(() => pkg()?.activity ?? [])

  return (
    <box>
      <text fg={theme().text}>
        <b>Execution</b>
      </text>
      <Show
        when={pkg()}
        fallback={
          <text fg={theme().textMuted}>
            <span style={{ fg: theme().success }}>●</span> Ready — awaiting prompt
          </text>
        }
      >
        <Row label="Task" value={pkg()!.currentTask} theme={theme} />
        <Row
          label="Confidence"
          value={pkg()!.confidence}
          theme={theme}
          color={confidenceColor(pkg()!.confidence, theme)}
        />
        <Show when={score()}>
          <text fg={theme().textMuted}>
            Score: <span fg={confidenceColor(pkg()!.confidence, theme)}>{score()}</span>
          </text>
        </Show>
        <text fg={theme().textMuted}>
          Status: <span fg={statusColor(pkg()!.status, theme)}>{pkg()!.status ?? "idle"}</span>
        </text>
        <Show when={pkg()!.needsOrchestration}>
          <text fg={theme().warning}>Specialists required</text>
        </Show>
        <Show when={pkg()!.needsOrchestration === false && pkg()!.status === "bypassed"}>
          <text fg={theme().success}>Pipeline bypassed — high confidence</text>
        </Show>
        <Row label="Workflow" value={pkg()!.activeWorkflow} theme={theme} />
        <Show when={(pkg()!.confidenceFactors?.length ?? 0) > 0}>
          <text fg={theme().textMuted}>Factors:</text>
          <For each={pkg()!.confidenceFactors ?? []}>
            {(factor) => (
              <text fg={theme().textMuted}>
                {"  "}
                {factor.name}: <span fg={theme().text}>{Math.round(Number(factor.value) * 100)}%</span>
              </text>
            )}
          </For>
        </Show>
        <Show when={activity().length > 0}>
          <text fg={theme().textMuted}>Activity:</text>
          <For each={activity().slice(0, 8)}>
            {(line) => (
              <text fg={theme().text}>
                {"  "}• {line}
              </text>
            )}
          </For>
        </Show>
        <Show when={phases().length > 0}>
          <text fg={theme().textMuted}>Services:</text>
          <For each={phases().slice(0, 12)}>
            {(phase) => (
              <text fg={theme().textMuted}>
                {"  "}
                <span fg={theme().warning}>●</span> {phase.name}
                <Show when={phase.result}>
                  <span fg={theme().text}> — {phase.result}</span>
                </Show>
                <Show when={phase.durationMs !== undefined}>
                  <span fg={theme().textMuted}> ({phase.durationMs}ms)</span>
                </Show>
              </text>
            )}
          </For>
        </Show>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 600,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = { id, tui }
export default plugin
