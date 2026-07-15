import { createMemo, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSync } from "../../context/sync"
import { useLocal } from "../../context/local"
import { useConnected } from "../../component/use-connected"
import { Locale } from "../../util/locale"

export const NAVBAR_HEIGHT = 1

export function Navbar(props: { sessionID?: string }) {
  const { theme } = useTheme()
  const sync = useSync()
  const local = useLocal()
  const connected = useConnected()
  const session = createMemo(() => (props.sessionID ? sync.session.get(props.sessionID) : undefined))
  const model = createMemo(() => local.model.parsed())
  const agent = createMemo(() => local.agent.current()?.name ?? "default")
  const mcp = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)
  const lsp = createMemo(() => Object.keys(sync.data.lsp).length)

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
          <b>OpenCode Nexus</b>
        </text>
        <Show when={session()}>
          {(s) => <text fg={theme.textMuted}>› {Locale.truncate(s().title ?? "", 40)}</text>}
        </Show>
      </box>
      <box gap={2} flexDirection="row" alignItems="center" flexShrink={0}>
        <Show
          when={connected()}
          fallback={<text fg={theme.warning}>/connect</text>}
        >
          <text fg={theme.textMuted}>
            <span style={{ fg: lsp() > 0 ? theme.success : theme.textMuted }}>•</span> {lsp()} LSP
          </text>
          <Show when={mcp()}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>⊙</span> {mcp()} MCP
            </text>
          </Show>
          <text fg={theme.text}>
            {agent()} <span style={{ fg: theme.textMuted }}>·</span> {model().model}
          </text>
        </Show>
      </box>
    </box>
  )
}
