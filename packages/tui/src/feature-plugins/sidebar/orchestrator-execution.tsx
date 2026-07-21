import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-execution"

function Row(props: { label: string; value: string | undefined; theme: () => any }) {
  return (
    <Show when={props.value}>
      <text fg={props.theme().textMuted}>
        {props.label}: <span fg={props.theme().text}>{props.value}</span>
      </text>
    </Show>
  )
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const pkg = createMemo(() => props.api.state.session.execution_package(props.session_id))

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
        <Row label="Confidence" value={pkg()!.confidence} theme={theme} />
        <Row label="Status" value={pkg()!.status} theme={theme} />
        <Show when={pkg()!.confidenceScore !== undefined}>
          <text fg={theme().textMuted}>
            Score: <span fg={theme().text}>{Math.round((pkg()!.confidenceScore ?? 0) * 100)}%</span>
          </text>
        </Show>
        <Row label="Workflow" value={pkg()!.activeWorkflow} theme={theme} />
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
