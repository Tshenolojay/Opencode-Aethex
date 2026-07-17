import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-models"

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
    <Show when={pkg()?.provider || pkg()?.model || pkg()?.capabilityMatch || pkg()?.routingStrategy || pkg()?.fallbackModel}>
      <box>
        <text fg={theme().text}>
          <b>Models</b>
        </text>
        <Row label="Provider" value={pkg()!.provider} theme={theme} />
        <Row label="Model" value={pkg()!.model} theme={theme} />
        <Row label="Capability" value={pkg()!.capabilityMatch} theme={theme} />
        <Row label="Routing" value={pkg()!.routingStrategy} theme={theme} />
        <Row label="Fallback" value={pkg()!.fallbackModel} theme={theme} />
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 800,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = { id, tui }
export default plugin
