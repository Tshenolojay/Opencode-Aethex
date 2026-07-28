import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, For, Show } from "solid-js"

const id = "internal:sidebar-orchestrator-specialists"

function statusColor(status: string | undefined, theme: () => any) {
  if (status === "executed" || status === "completed") return theme().success
  if (status === "planned" || status === "orchestrating") return theme().warning
  if (status === "bypassed" || status === "fallback") return theme().textMuted
  return theme().text
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const pkg = createMemo(() => props.api.state.session.execution_package(props.session_id))
  const specialists = createMemo(() => pkg()?.specialists ?? [])

  return (
    <box>
      <text fg={theme().text}>
        <b>Specialists</b>
      </text>
      <Show
        when={specialists().length || pkg()?.planningSummary || pkg()?.consensusSummary || pkg()?.needsOrchestration === false}
        fallback={
          <text fg={theme().textMuted}>
            <span style={{ fg: theme().success }}>●</span> Ready — specialists will activate on low confidence
          </text>
        }
      >
        <Show when={pkg()?.needsOrchestration === false && specialists().length === 0}>
          <text fg={theme().textMuted}>
            <span style={{ fg: theme().success }}>●</span> Bypassed — high confidence
          </text>
        </Show>
        <For each={specialists()}>
          {(specialist) => (
            <text fg={theme().textMuted}>
              <span style={{ fg: statusColor(specialist.status, theme) }}>●</span> {specialist.name}
              <Show when={specialist.role}>
                <span fg={theme().text}> — {specialist.role}</span>
              </Show>
              <Show when={specialist.status}>
                <span fg={statusColor(specialist.status, theme)}> [{specialist.status}]</span>
              </Show>
            </text>
          )}
        </For>
        <Show when={pkg()?.planningSummary}>
          <text fg={theme().textMuted}>
            Plan: <span fg={theme().text}>{pkg()!.planningSummary}</span>
          </text>
        </Show>
        <Show when={pkg()?.consensusSummary}>
          <text fg={theme().textMuted}>
            Consensus: <span fg={theme().text}>{pkg()!.consensusSummary}</span>
          </text>
        </Show>
      </Show>
    </box>
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
