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
  const hasContent = createMemo(
    () =>
      (pkg()?.recommendations?.length ?? 0) > 0 ||
      (pkg()?.risks?.length ?? 0) > 0 ||
      (pkg()?.constraints?.length ?? 0) > 0 ||
      (pkg()?.toolAdvice?.length ?? 0) > 0 ||
      (pkg()?.workflowSuggestions?.length ?? 0) > 0 ||
      (pkg()?.phases?.length ?? 0) > 0,
  )

  return (
    <box>
      <text fg={theme().text}>
        <b>Planning</b>
      </text>
      <Show
        when={hasContent()}
        fallback={
          <text fg={theme().textMuted}>
            <span style={{ fg: theme().success }}>●</span> Ready — planning active on prompt
          </text>
        }
      >
        <Show when={(pkg()?.phases?.length ?? 0) > 0}>
          <text fg={theme().textMuted}>Pipeline:</text>
          <For each={pkg()!.phases ?? []}>
            {(phase) => (
              <text fg={theme().text}>
                {" "}• {phase.name}
                <Show when={phase.result}>
                  <span fg={theme().textMuted}> ({phase.result})</span>
                </Show>
              </text>
            )}
          </For>
        </Show>
        <List title="Recommendations" items={pkg()?.recommendations} theme={theme} />
        <List title="Risks" items={pkg()?.risks} theme={theme} />
        <List title="Constraints" items={pkg()?.constraints} theme={theme} />
        <List title="Tool advice" items={pkg()?.toolAdvice} theme={theme} />
        <List title="Workflows" items={pkg()?.workflowSuggestions} theme={theme} />
      </Show>
    </box>
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
