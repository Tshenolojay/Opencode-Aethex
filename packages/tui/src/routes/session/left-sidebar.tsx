import { createMemo, For, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSync } from "../../context/sync"
import { useRoute } from "../../context/route"
import { useDialog } from "../../ui/dialog"
import { DialogHelp } from "../../ui/dialog-help"
import { CommandPaletteDialog } from "../../component/command-palette"
import { Locale } from "../../util/locale"
import { getScrollAcceleration } from "../../util/scroll"
import { useTuiConfig } from "../../config"
import { Flag } from "@opencode-ai/core/flag/flag"
import { useProject } from "../../context/project"
import { FileTree } from "./file-tree"

export const LEFT_SIDEBAR_WIDTH = 32

export function LeftSidebar(props: {
  sessionID?: string
  onClose?: () => void
  root?: string
  onOpenFile?: (path: string) => void
}) {
  const { theme } = useTheme()
  const sync = useSync()
  const route = useRoute()
  const dialog = useDialog()
  const project = useProject()
  const tuiConfig = useTuiConfig()
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))
  const sessions = createMemo(() =>
    sync.data.session
      .filter((x) => x.parentID === undefined)
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .slice(0, 100),
  )
  const activeID = createMemo(() => (route.data.type === "session" ? route.data.sessionID : undefined))
  const workspaces = createMemo(() =>
    Flag.OPENCODE_EXPERIMENTAL_WORKSPACES ? project.workspace.list() : [],
  )
  const activeWorkspace = createMemo(() => project.workspace.current() ?? "")

  return (
    <box
      width={LEFT_SIDEBAR_WIDTH}
      height="100%"
      flexShrink={0}
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      borderColor={theme.border}
      border={["right"]}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={1}
      paddingRight={1}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between" alignItems="center">
        <text fg={theme.textMuted}>Explorer</text>
        <Show when={props.onClose}>
          <text fg={theme.textMuted} onMouseUp={() => props.onClose?.()}>
            [x]
          </text>
        </Show>
      </box>
      <scrollbox
        flexGrow={1}
        scrollAcceleration={scrollAcceleration()}
        verticalScrollbarOptions={{
          trackOptions: {
            backgroundColor: theme.background,
            foregroundColor: theme.borderActive,
          },
        }}
      >
        <Show when={props.root}>
          <text fg={theme.textMuted}> Files</text>
          <FileTree root={props.root!} onOpenFile={(path) => props.onOpenFile?.(path)} />
        </Show>
        <Show when={workspaces().length > 0}>
          <box height={1} />
          <text fg={theme.textMuted}> Workspaces</text>
          <For each={workspaces()}>
            {(ws) => (
              <box
                paddingLeft={2}
                onMouseUp={() => {
                  if (activeWorkspace() === ws.id) return
                  project.workspace.set(ws.id)
                  void sync.bootstrap({ fatal: false })
                }}
              >
                <text fg={activeWorkspace() === ws.id ? theme.text : theme.textMuted}>
                  {activeWorkspace() === ws.id ? "● " : "  "}
                  {ws.name ?? ws.id}
                </text>
              </box>
            )}
          </For>
        </Show>
        <box height={1} />
        <text fg={theme.textMuted}> Sessions</text>
        <For each={sessions()}>
          {(s) => {
            const selected = createMemo(() => activeID() === s.id)
            return (
              <box
                paddingTop={0}
                paddingBottom={0}
                paddingLeft={1}
                paddingRight={1}
                onMouseUp={() => route.navigate({ type: "session", sessionID: s.id })}
              >
                <text fg={selected() ? theme.text : theme.textMuted}>
                  {selected() ? "▸ " : "  "}
                  {Locale.truncate(s.title ?? "Untitled", LEFT_SIDEBAR_WIDTH - 6)}
                </text>
              </box>
            )
          }}
        </For>
      </scrollbox>
      <box flexDirection="row" gap={1} paddingLeft={1}>
        <text fg={theme.textMuted} onMouseUp={() => route.navigate({ type: "home" })}>
          {"＋ new"}
        </text>
        <text
          fg={theme.textMuted}
          onMouseUp={() => dialog.replace(() => <CommandPaletteDialog />)}
        >
          {"⚙ settings"}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.replace(() => <DialogHelp />)}>
          {"? help"}
        </text>
      </box>
    </box>
  )
}
