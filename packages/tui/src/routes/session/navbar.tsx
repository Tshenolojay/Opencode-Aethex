import { createMemo, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSync } from "../../context/sync"
import { useLocal } from "../../context/local"
import { useConnected } from "../../component/use-connected"
import { Locale } from "../../util/locale"

export const NAVBAR_HEIGHT = 1

function confidenceColor(level: string | undefined, theme: { success: string; warning: string; error: string; textMuted: string }) {
  if (level === "high") return theme.success
  if (level === "medium") return theme.warning
  if (level === "low") return theme.error
  return theme.textMuted
}

export function Navbar(props: { sessionID?: string }) {
  const { theme } = useTheme()
  const sync = useSync()
  const local = useLocal()
  const connected = useConnected()
  const session = createMemo(() => (props.sessionID ? sync.session.get(props.sessionID) : undefined))
  const model = createMemo(() => local.model.parsed())
  const agent = createMemo(() => local.agent.current()?.name ?? "default")
  const branch = createMemo(() => sync.data.vcs?.branch)
  const execution = createMemo(() =>
    props.sessionID ? sync.data.execution_package[props.sessionID] : undefined,
  )
  const confidence = createMemo(() => execution()?.confidence)
  const specialistCount = createMemo(() => execution()?.specialists?.length ?? 0)

  return (
    <box
      height={NAVBAR_HEIGHT}
      flexShrink={0}
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingLeft={2}
      paddingRight={2}
      backgroundColor={theme.backgroundPanel}
      borderColor={theme.border}
      border={["bottom"]}
    >
      <box gap={1} flexDirection="row" alignItems="center">
        <text fg={theme.text}>
          <b>OpenCode Aethex</b>
        </text>
        <Show when={session()}>
          {(s) => <text fg={theme.textMuted}>› {Locale.truncate(s().title ?? "", 32)}</text>}
        </Show>
      </box>
      <box gap={2} flexDirection="row" alignItems="center" flexShrink={0}>
        <Show
          when={connected()}
          fallback={<text fg={theme.warning}>/connect</text>}
        >
          <Show when={confidence()}>
            <text fg={confidenceColor(confidence(), theme)}>
              conf:{confidence()}
              <Show when={specialistCount() > 0}>
                <span fg={theme.textMuted}> · {specialistCount()} spec</span>
              </Show>
            </text>
          </Show>
          <Show when={branch()}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>⎇</span> {Locale.truncate(branch()!, 16)}
            </text>
          </Show>
          <text fg={theme.text}>
            {Locale.truncate(agent(), 12)} <span style={{ fg: theme.textMuted }}>·</span>{" "}
            {Locale.truncate(model().model, 18)}
          </text>
        </Show>
      </box>
    </box>
  )
}
