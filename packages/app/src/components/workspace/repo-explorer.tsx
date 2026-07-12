import { createMemo, createSignal, onMount, Show, For } from "solid-js"
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
import { usePrompt } from "@/context/prompt"
import { showToast } from "@/utils/toast"
import { getFilename } from "@opencode-ai/core/util/path"
import { useWorkspaceData, type FileAction } from "./use-workspace-data"

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

function FileActionsRow(props: { actions: FileAction[]; onAction: (action: FileAction) => void }) {
  return (
    <div class="flex flex-wrap gap-1 px-2 pt-1">
      <For each={props.actions}>
        {(action) => (
          <button
            type="button"
            class="text-11-medium px-1.5 py-0.5 rounded bg-v2-surface-muted text-text-faint hover:bg-v2-surface-hover hover:text-text-base transition-colors"
            onClick={() => props.onAction(action)}
            title={action.label}
          >
            {action.label}
          </button>
        )}
      </For>
    </div>
  )
}

function RepoContextPanel(props: { previewPath: () => string | undefined }) {
  const sdk = useSDK()
  const file = useFile()
  const prompt = usePrompt()
  const sync = useSync()
  const params = useParams()
  const data = useWorkspaceData()

  const [selectedPath, setSelectedPath] = createSignal<string | undefined>()

  const stats = createMemo(() => {
    const dir = sdk().directory
    if (!dir) return undefined
    const state = file.tree.state("")
    return { files: state?.files ?? 0, dirs: state?.dirs ?? 0, dir }
  })

  const diffs = () => params.id ? sync().data.session_diff[params.id] ?? [] : []

  const activePath = createMemo(() => selectedPath() ?? props.previewPath())

  const fileInfo = createMemo(() => {
    const path = activePath()
    if (!path || !stats()) return undefined
    const ext = path.split(".").pop() ?? ""
    const layers = ["src", "lib", "components", "pages", "utils", "hooks", "styles"]
    const layer = layers.find((l) => path.includes(`/${l}/`)) ?? "root"
    return {
      path,
      name: getFilename(path),
      extension: ext,
      architectureLayer: layer,
      dependencyRisk: ext === "ts" || ext === "tsx" ? "low" : ext === "js" ? "medium" : "unknown",
      importedModules: [] as string[],
      relatedFiles: [] as string[],
    }
  })

  const actions = createMemo(() => data.filePreviewActions(activePath()))
  const relatedFiles = createMemo(() => data.fileRelatedFiles(activePath()))
  const importedModules = createMemo(() => data.fileImportedModules(activePath()))

  const handleAction = (action: FileAction) => {
    const current = prompt.current()
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: action.prompt }])
    } else {
      prompt.set([{ type: "text", content: action.prompt, start: 0, end: action.prompt.length }])
    }
    showToast({ title: action.label, message: `Prompt set for ${action.id}`, variant: "info" })
  }

  const handleAskRepo = () => {
    const question = "What can you tell me about this workspace?"
    const current = prompt.current()
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: question }])
    } else {
      prompt.set([{ type: "text", content: question, start: 0, end: question.length }])
    }
  }

  const handleRelatedClick = (path: string) => {
    const current = prompt.current()
    const question = `Explain how ${path} relates to this workspace`
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: question }])
    } else {
      prompt.set([{ type: "text", content: question, start: 0, end: question.length }])
    }
  }

  return (
    <Show when={stats()}>
      <div class="px-3 pb-2 border-b border-border-weaker-base">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
          <span class="text-12-medium text-text-strong">Repository</span>
        </div>
        <div class="text-11-regular text-text-faint space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="w-14 shrink-0">Files:</span>
            <span class="text-text-base">{stats()!.files}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-14 shrink-0">Dirs:</span>
            <span class="text-text-base">{stats()!.dirs}</span>
          </div>
          <Show when={diffs().length > 0}>
            <div class="flex items-center gap-2">
              <span class="w-14 shrink-0">Changes:</span>
              <span class="text-text-base">{diffs().length}</span>
            </div>
          </Show>
          <Show when={fileInfo()}>
            <div class="mt-2 pt-2 border-t border-border-weaker-base">
              <div class="flex items-center gap-2 mb-1">
                <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
                <span class="text-12-medium text-text-strong truncate">{fileInfo()!.name}</span>
                <button
                  type="button"
                  class="ml-auto size-4 flex items-center justify-center rounded hover:bg-v2-surface-hover"
                  onClick={() => { setSelectedPath(undefined) }}
                  title="Clear selection"
                >
                  <Icon name="xmark-small" size="sm" class="text-icon-base" />
                </button>
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="w-14 shrink-0">Layer:</span>
                  <span class="text-text-base">{fileInfo()!.architectureLayer}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-14 shrink-0">Risk:</span>
                  <span class="text-text-base">{fileInfo()!.dependencyRisk}</span>
                </div>
                <Show when={importedModules().length > 0}>
                  <div class="flex items-start gap-2 pt-1">
                    <span class="w-14 shrink-0">Modules:</span>
                    <div class="flex flex-wrap gap-1">
                      <For each={importedModules()}>
                        {(mod) => (
                          <span class="text-11-medium px-1 py-0.5 rounded bg-v2-surface-muted text-text-faint">{mod}</span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
                <Show when={relatedFiles().length > 0}>
                  <div class="pt-1">
                    <div class="text-text-faint mb-0.5">Related files:</div>
                    <div class="flex flex-col gap-0.5 max-h-[100px] overflow-y-auto">
                      <For each={relatedFiles().slice(0, 5)}>
                        {(rf) => (
                          <div
                            class="flex items-center gap-1 text-11-regular text-text-faint hover:text-text-base hover:bg-v2-surface-hover rounded px-1 py-0.5 cursor-pointer truncate transition-colors"
                            onClick={() => handleRelatedClick(rf.path)}
                          >
                            <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
                            <span class="truncate">{rf.name}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
        <Show when={actions().length > 0}>
          <FileActionsRow actions={actions()} onAction={handleAction} />
        </Show>
        <button
          type="button"
          class="mt-1.5 flex items-center gap-1.5 w-full py-1 px-2 rounded text-12-regular text-v2-text-text-accent hover:bg-v2-icon-icon-accent/10 transition-colors"
          onClick={handleAskRepo}
        >
          <Icon name="outline-square-arrow" size="sm" class="text-icon-base shrink-0" />
          <span>Ask about workspace</span>
        </button>
      </div>
    </Show>
  )
}

function FavoriteFilesPanel() {
  const data = useWorkspaceData()
  const prompt = usePrompt()

  const files = createMemo(() => data.favoriteFilesData())

  const handleClick = (path: string) => {
    const current = prompt.current()
    const question = `Show me details about ${path}`
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: question }])
    } else {
      prompt.set([{ type: "text", content: question, start: 0, end: question.length }])
    }
  }

  const actionLabel = (action: string) => {
    if (action === "modified") return "Modified"
    if (action === "reviewed") return "Reviewed"
    if (action === "analysed") return "Analysed"
    return action
  }

  return (
    <Show when={files().length > 0}>
      <div class="border-b border-border-weaker-base">
        <Collapsible defaultOpen={false}>
          <Collapsible.Trigger class="flex items-center gap-1.5 w-full px-3 py-1.5 text-13-medium text-text-base hover:bg-v2-surface-hover transition-colors">
            <Collapsible.Arrow />
            <Icon name="outline-dots" size="sm" class="text-icon-base shrink-0" />
            <span class="truncate">Session Files</span>
            <span class="ml-auto text-11-medium px-1.5 py-0.5 rounded-full bg-v2-surface-selected text-text-weak">{files().length}</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div class="px-3 pb-2 max-h-[160px] overflow-y-auto">
              <For each={files().slice(0, 10)}>
                {(file) => (
                  <div
                    class="flex items-center gap-1.5 py-0.5 px-1 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors cursor-pointer truncate"
                    onClick={() => handleClick(file.path)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(file.path) }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select ${file.name}`}
                  >
                    <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
                    <span class="truncate flex-1">{file.name}</span>
                    <span class="text-11-regular text-text-faint shrink-0">{actionLabel(file.action)}</span>
                  </div>
                )}
              </For>
            </div>
          </Collapsible.Content>
        </Collapsible>
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
  const prompt = usePrompt()

  const [query, setQuery] = createSignal("")
  const [results, setResults] = createSignal<string[]>([])
  const [previewFile, setPreviewFile] = createSignal<string | undefined>()

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

  const handleFileResultClick = (path: string) => {
    const current = prompt.current()
    const question = `Show me ${path}`
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: question }])
    } else {
      prompt.set([{ type: "text", content: question, start: 0, end: question.length }])
    }
    showToast({ title: "File selected", message: path, variant: "info" })
  }

  const handleFilePreview = (path: string) => {
    setPreviewFile(path)
  }

  const handleClearPreview = () => {
    setPreviewFile(undefined)
  }

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
                  <div
                    class="flex items-center gap-1.5 py-0.5 px-1 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors cursor-pointer truncate"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${path}`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleFileResultClick(path) }}
                  >
                    <span
                      class="truncate flex-1 min-w-0"
                      onClick={() => handleFileResultClick(path)}
                    >
                      {path}
                    </span>
                    <button
                      type="button"
                      class="size-5 flex items-center justify-center rounded hover:bg-v2-surface-hover shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleFilePreview(path) }}
                      title="Quick preview"
                      aria-label={`Preview ${path}`}
                    >
                      <Icon name="monitor" size="sm" class="text-icon-base" />
                    </button>
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

      <Show when={!query().trim()}>
        <RepoContextPanel previewPath={previewFile} />
      </Show>

      <Show when={!query().trim()}>
        <FavoriteFilesPanel />
      </Show>

      <Show when={previewFile()}>
        <FilePreviewOverlay path={previewFile()!} onClose={handleClearPreview} />
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

function FilePreviewOverlay(props: { path: string; onClose: () => void }) {
  const file = useFile()
  const sdk = useSDK()

  const state = createMemo(() => {
    const dir = sdk().directory
    if (!dir) return undefined
    const fullPath = props.path.startsWith("/") ? props.path : `${dir}/${props.path}`
    return file.get(fullPath)
  })

  const content = createMemo(() => {
    const s = state()
    if (!s || !s.content) return undefined
    const raw = s.content
    if (typeof raw === "string") return raw.slice(0, 600)
    if (typeof raw === "object" && "text" in raw) return (raw as { text: string }).text.slice(0, 600)
    return undefined
  })

  const isLoaded = createMemo(() => state()?.loaded ?? false)
  const isLoading = createMemo(() => state()?.loading ?? false)

  onMount(() => {
    const dir = sdk().directory
    if (!dir) return
    const fullPath = props.path.startsWith("/") ? props.path : `${dir}/${props.path}`
    if (!isLoaded()) {
      file.load(fullPath)
    }
  })

  return (
    <div class="shrink-0 border-b border-border-weaker-base">
      <div class="flex items-center gap-1.5 px-3 py-1">
        <Icon name="monitor" size="sm" class="text-icon-base shrink-0" />
        <span class="text-12-medium text-text-strong truncate flex-1">{getFilename(props.path)}</span>
        <button
          type="button"
          class="size-4 flex items-center justify-center rounded hover:bg-v2-surface-hover"
          onClick={props.onClose}
          aria-label="Close preview"
        >
          <Icon name="xmark-small" size="sm" class="text-icon-base" />
        </button>
      </div>
      <div class="px-3 pb-2 max-h-[120px] overflow-y-auto">
        <Show when={content()} fallback={
          <div class="text-11-regular text-text-faint italic">
            {isLoading() ? "Loading..." : "Click to load file content"}
          </div>
        }>
          <pre class="text-11-regular text-text-faint whitespace-pre-wrap font-mono leading-relaxed">
            {content()}
          </pre>
        </Show>
      </div>
    </div>
  )
}
