import { createMemo, createResource, For, Show, type Component } from "solid-js"
import { createStore } from "solid-js/store"
import { useTheme } from "../../context/theme"
import { readdir } from "node:fs/promises"
import { join } from "node:path"

const IGNORED = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  "build",
  ".opencode",
  ".turbo",
  "coverage",
])

export type FileEntry = { name: string; path: string; dir: boolean }

async function listDir(dir: string): Promise<FileEntry[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => !IGNORED.has(entry.name))
    .map((entry) => ({ name: entry.name, path: join(dir, entry.name), dir: entry.isDirectory() }))
    .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name))
}

export function FileTree(props: { root: string; onOpenFile: (path: string) => void }) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = createStore<Record<string, boolean>>({})
  const [rootEntries] = createResource(() => props.root, (dir) => listDir(dir))

  const TreeNode: Component<{
    entry: FileEntry
    depth: number
    onOpenFile: (path: string) => void
  }> = (node) => {
    const isDir = node.entry.dir
    const isOpen = createMemo(() => expanded[node.entry.path] === true)
    const [children] = createResource(
      () => (isOpen() ? node.entry.path : undefined),
      (dir) => listDir(dir),
    )
    return (
      <>
        <box
          paddingLeft={1 + node.depth * 2}
          paddingTop={0}
          paddingBottom={0}
          onMouseUp={() => {
            if (isDir) setExpanded(node.entry.path, !isOpen())
            else node.onOpenFile(node.entry.path)
          }}
        >
          <text fg={isDir ? theme.text : theme.textMuted}>
            {isDir ? (isOpen() ? "▾ " : "▸ ") : "  "}
            {node.entry.name}
          </text>
        </box>
        <Show when={isDir && isOpen()}>
          <For each={children() ?? []}>
            {(child) => <TreeNode entry={child} depth={node.depth + 1} onOpenFile={node.onOpenFile} />}
          </For>
        </Show>
      </>
    )
  }

  return (
    <For each={rootEntries() ?? []}>
      {(entry) => <TreeNode entry={entry} depth={0} onOpenFile={props.onOpenFile} />}
    </For>
  )
}
