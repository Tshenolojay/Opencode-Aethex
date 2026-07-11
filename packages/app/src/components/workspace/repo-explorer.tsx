import { createMemo, createSignal, Show, For } from "solid-js"
import { useParams } from "@solidjs/router"
import { debounce } from "@solid-primitives/scheduled"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { Icon } from "@opencode-ai/ui/v2/icon"
import FileTreeV2 from "@/components/file-tree-v2"
import { useSettings } from "@/context/settings"
import { useSDK } from "@/context/sdk"
import { useLayout } from "@/context/layout"
import { useFile } from "@/context/file"
import { useSync } from "@/context/sync"
import { getFilename } from "@opencode-ai/core/util/path"

function BranchBadge() {
  const sync = useSync()
  const branch = () => sync().data.vcs?.branch
  return (
    <Show when={branch()}>
      <div class="flex items-center gap-0.5 text-11-medium px-1.5 py-0.5 rounded bg-v2-surface-muted text-text-faint truncate shrink-0 max-w-[140px]">
        <Icon name="branch" size="sm" class="shrink-0 text-icon-base" />
        <span class="truncate">{branch()}</span>
      </div>
    </Show>
  )
}

function RepoSearchInput(props: { query: () => string; onInput: (q: string) => void }) {
  return (
    <div class="px-2 py-1">
      <div class="flex items-center gap-1 px-2 py-1 rounded bg-v2-surface-muted text-12-regular text-text-faint">
        <Icon name="magnifying-glass" size="sm" class="text-icon-base shrink-0" />
        <input
          type="text"
          value={props.query()}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          placeholder="Search files..."
          class="flex-1 bg-transparent border-none outline-none text-12-regular text-text-base placeholder:text-text-faint min-w-0"
        />
        <Show when={props.query()}>
          <button
            type="button"
            onClick={() => props.onInput("")}
            class="size-4 flex items-center justify-center rounded hover:bg-v2-surface-hover"
            aria-label="Clear search"
          >
            <Icon name="xmark-small" size="sm" class="text-icon-base" />
          </button>
        </Show>
      </div>
    </div>
  )
}

function GitStatusSummary() {
  const params = useParams()
  const sync = useSync()
  const diffs = () => {
    if (!params.id) return []
    return sync().data.session_diff[params.id] ?? []
  }
  const modified = () => diffs().filter((d) => d.status === "modified").length
  const added = () => diffs().filter((d) => d.status === "added").length
  const deleted = () => diffs().filter((d) => d.status === "deleted").length
  const total = () => diffs().length

  return (
    <Show when={total() > 0}>
      <div class="flex gap-1 px-3 pb-1">
        <Show when={modified() > 0}>
          <span class="text-11-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">{modified()}M</span>
        </Show>
        <Show when={added() > 0}>
          <span class="text-11-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">{added()}A</span>
        </Show>
        <Show when={deleted() > 0}>
          <span class="text-11-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">{deleted()}D</span>
        </Show>
      </div>
    </Show>
  )
}

function RepoOutline() {
  const file = useFile()
  const stats = createMemo(() => {
    const state = file.tree.state("")
    if (!state) return { files: 0, dirs: 0 }
    return { files: state.files ?? 0, dirs: state.dirs ?? 0 }
  })
  return (
    <Show when={stats().files > 0 || stats().dirs > 0}>
      <div class="text-11-regular text-text-faint px-3 pb-1 flex items-center gap-2">
        <span>{stats().files} files</span>
        <span>·</span>
        <span>{stats().dirs} dirs</span>
      </div>
    </Show>
  )
}

export function RepoExplorer() {
  const settings = useSettings()
  const sdk = useSDK()
  const layout = useLayout()
  const file = useFile()
  const params = useParams()

  const [query, setQuery] = createSignal("")
  const [results, setResults] = createSignal<string[]>([])

  const search = debounce((q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    void file.searchFiles(q).then(setResults)
  }, 200)

  const handleInput = (q: string) => {
    setQuery(q)
    search(q)
  }

  const project = createMemo(() => {
    const dir = sdk().directory
    if (!dir) return undefined
    return layout.projects.list().find((p) => p.worktree === dir || p.sandboxes?.includes(dir))
  })

  const name = createMemo(() => {
    const current = project()
    const dir = sdk().directory
    if (current) return current.name || getFilename(current.worktree)
    if (dir) return getFilename(dir)
    return "Workspace"
  })

  const hasResults = createMemo(() => results().length > 0)
  const isSearching = createMemo(() => query().trim().length > 0 && !hasResults())

  return (
    <div class="flex flex-col h-full bg-v2-background-bg-deep overflow-hidden">
      <div class="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-border-weaker-base">
        <Show when={settings.visibility.leftSidebar()}>
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <Icon name="workspace" size="sm" class="text-icon-base shrink-0" />
            <span class="text-13-medium text-text-strong truncate">{name()}</span>
          </div>
        </Show>
      </div>
      <Show when={sdk().directory}>
        <div class="shrink-0 px-3 pb-2 fle items-center gap-1.5 border-b border-border-weaker-base pt-1">
          <BranchBadge />
        </div>
      </Show>
      <RepoSearchInput query={query} onInput={handleInput} />

      <Show when={hasResults()}>
        <div class="shrink-0 px-3 pb-2">
          <div class="text-11-regular text-text-faint pb-1">{results().length} results</div>
          <div class="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
            <For each={results()}>
              {(path) => (
                <div class="flex items-center gap-1.5 py-0.5 px-1 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors cursor-pointer truncate">
                  <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
                  <span class="truncate">{path}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={isSearching()}>
        <div class="shrink-0 px-3 pb-2">
          <div class="text-12-regular text-text-faint italic">Searching...</div>
        </div>
      </Show>

      <Show when={!query().trim()}>
        <GitStatusSummary />
        <RepoOutline />
      </Show>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <Collapsible defaultOpen>
          <Collapsible.Trigger class="flex items-center gap-1.5 w-full px-3 py-1.5 text-13-medium text-text-base hover:bg-v2-surface-hover transition-colors">
            <Collapsible.Arrow />
            <span>Explorer</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div class="pl-1">
              <FileTreeV2 />
            </div>
          </Collapsible.Content>
        </Collapsible>
      </div>
    </div>
  )
}
