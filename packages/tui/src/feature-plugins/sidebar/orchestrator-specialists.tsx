import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, For, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-specialists"

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const pkg = createMemo(() => props.api.state.session.execution_package(props.session_id))

  return (
    <Show when={pkg()?.specialists?.length || pkg()?.planningSummary || pkg()?.consensusSummary}>
      <box>
        <text fg={theme().text}>
          <b>Specialists</b>
        </text>
        <For each={pkg()!.specialists ?? []}>
          {(specialist) => (
            <text fg={theme().textMuted}>
              • {specialist.name}
              <Show when={specialist.role}>
                <span fg={theme().text}> ({specialist.role})</span>
              </Show>
            </text>
          )}
        </For>
        <Show when={pkg()!.planningSummary}>
          <text fg={theme().textMuted}>
            Plan: <span fg={theme().text}>{pkg()!.planningSummary}</span>
          </text>
        </Show>
        <Show when={pkg()!.consensusSummary}>
          <text fg={theme().textMuted}>
            Consensus: <span fg={theme().text}>{pkg()!.consensusSummary}</span>
          </text>
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 700,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = { id, tui }
export default plugin
