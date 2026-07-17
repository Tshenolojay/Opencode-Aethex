import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, For, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-planning"

function List(props: { title: string | undefined; items: readonly string[] | undefined; theme: () => any }) {
  return (
    <Show when={props.items && props.items.length > 0}>
      <text fg={props.theme().textMuted}>
        {props.title}:
      </text>
      <For each={props.items ?? []}>
        {(item) => <text fg={props.theme().text}> • {item}</text>}
      </For>
    </Show>
  )
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const pkg = createMemo(() => props.api.state.session.execution_package(props.session_id))

  return (
    <Show
      when={
        (pkg()?.recommendations && pkg()!.recommendations.length > 0) ||
        (pkg()?.risks && pkg()!.risks.length > 0) ||
        (pkg()?.constraints && pkg()!.constraints.length > 0) ||
        (pkg()?.toolAdvice && pkg()!.toolAdvice.length > 0) ||
        (pkg()?.workflowSuggestions && pkg()!.workflowSuggestions.length > 0)
      }
    >
      <box>
        <text fg={theme().text}>
          <b>Planning</b>
        </text>
        <List title="Recommendations" items={pkg()!.recommendations} theme={theme} />
        <List title="Risks" items={pkg()!.risks} theme={theme} />
        <List title="Constraints" items={pkg()!.constraints} theme={theme} />
        <List title="Tool advice" items={pkg()!.toolAdvice} theme={theme} />
        <List title="Workflows" items={pkg()!.workflowSuggestions} theme={theme} />
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 1000,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = { id, tui }
export default plugin
