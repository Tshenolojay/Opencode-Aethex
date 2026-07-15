import { For } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../config"
import { getScrollAcceleration } from "../../util/scroll"

export function FileViewer(props: { path: string; lines: string[]; onClose: () => void }) {
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const scrollAcceleration = getScrollAcceleration(tuiConfig)
  const name = () => props.path.split("/").at(-1) ?? props.path

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      flexDirection="column"
      backgroundColor={theme.background}
      onMouseUp={() => props.onClose()}
    >
      <box
        flexShrink={0}
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        borderColor={theme.border}
        border={["bottom"]}
      >
        <text fg={theme.text}>
          <b>{name()}</b>
        </text>
        <text fg={theme.textMuted}>{props.path}</text>
        <text fg={theme.textMuted}>
          {" "}
          · click to close
        </text>
      </box>
      <scrollbox
        flexGrow={1}
        paddingLeft={2}
        paddingTop={1}
        paddingBottom={1}
        scrollAcceleration={scrollAcceleration}
        verticalScrollbarOptions={{
          trackOptions: {
            backgroundColor: theme.background,
            foregroundColor: theme.borderActive,
          },
        }}
      >
        <For each={props.lines}>{(line) => <text fg={theme.textMuted}>{line.length ? line : " "}</text>}</For>
      </scrollbox>
    </box>
  )
}
