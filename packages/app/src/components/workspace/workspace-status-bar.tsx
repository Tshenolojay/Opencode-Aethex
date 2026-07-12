import { Show, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { useWorkspaceData } from "./use-workspace-data"

export function WorkspaceStatusBar() {
  const data = useWorkspaceData()

  const statusStyle = createMemo(() => {
    const status = data.sessionStatus()
    if (status === "busy") return "bg-v2-icon-icon-accent/10 text-v2-text-text-accent"
    if (status === "idle" && data.sessionID()) return "bg-green-500/10 text-green-500"
    return "bg-v2-surface-muted text-text-faint"
  })

  const statusLabel = createMemo(() => {
    const status = data.sessionStatus()
    if (status === "busy") return "Running"
    if (status === "idle" && data.sessionID()) return "Ready"
    return "Inactive"
  })

  const item = (label: string, value: string, icon: string) => (
    <Show when={value && value !== "—"}>
      <div class="flex items-center gap-1 px-2 py-0.5 rounded text-11-regular" title={`${label}: ${value}`} aria-label={`${label}: ${value}`}>
        <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base shrink-0" />
        <span class="text-text-faint hidden md:inline">{label}:</span>
        <span class="text-text-weak truncate max-w-[100px]">{value}</span>
      </div>
    </Show>
  )

  return (
    <div class="h-6 shrink-0 flex items-center gap-1 px-2 border-t border-border-weaker-base bg-v2-background-bg-base text-11-regular overflow-x-auto" role="status" aria-label="Workspace status bar">
      <div class={`flex items-center gap-1 px-1.5 py-0.5 rounded ${statusStyle()} shrink-0`} aria-label={`Session status: ${statusLabel()}`}>
        <div class="size-1.5 rounded-full bg-current" />
        <span>{statusLabel()}</span>
      </div>
      <div class="w-px h-3 bg-border-weaker-base shrink-0 mx-0.5" aria-hidden="true" />
      {item("Model", data.indexedStateData().model, "settings-gear")}
      {item("Agent", data.indexedStateData().agent, "grid-plus")}
      {item("Strategy", data.indexedStateData().strategy, "branch")}
      <div class="w-px h-3 bg-border-weaker-base shrink-0 mx-0.5" aria-hidden="true" />
      {item("Files", `${data.indexedStateData().totalFiles}`, "filetree")}
      {item("Memory", data.indexedStateData().memory, "split")}
      <div class="ml-auto flex items-center gap-1">
        <Show when={data.indexedStateData().indexed}>
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-500" aria-label="Workspace indexed">
            <div class="size-1.5 rounded-full bg-current" />
            <span class="hidden md:inline">Indexed</span>
          </div>
        </Show>
      </div>
    </div>
  )
}
