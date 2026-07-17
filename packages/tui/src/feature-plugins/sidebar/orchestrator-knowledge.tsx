import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-knowledge"

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
    <Show
      when={
        pkg()?.repositoryIntelligence ||
        pkg()?.architectureSummary ||
        pkg()?.dependencySummary ||
        pkg()?.documentationSummary ||
        pkg()?.verificationSummary
      }
    >
      <box>
        <text fg={theme().text}>
          <b>Knowledge</b>
        </text>
        <Row label="Repository" value={pkg()!.repositoryIntelligence} theme={theme} />
        <Row label="Architecture" value={pkg()!.architectureSummary} theme={theme} />
        <Row label="Dependencies" value={pkg()!.dependencySummary} theme={theme} />
        <Row label="Documentation" value={pkg()!.documentationSummary} theme={theme} />
        <Row label="Verification" value={pkg()!.verificationSummary} theme={theme} />
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 900,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = { id, tui }
export default plugin
