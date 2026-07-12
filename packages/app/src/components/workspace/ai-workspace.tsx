import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import { debounce } from "@solid-primitives/scheduled"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { usePrompt } from "@/context/prompt"
import { showToast } from "@/utils/toast"
import { useWorkspaceData, type LiveSpecialistActivity, type TimelineEvent, type AiSuggestion, type FollowUpAction, type AiReasoningItem, type AdvancedTool, type AiExecutionData, type RepoIntelligenceData, type AppIntelligenceData, type SpecialistInfo, type ConversationSearchResult } from "./use-workspace-data"

function EmptyState(props: { icon: Parameters<typeof Icon>[0]["name"]; label: string }) {
  return (
    <div class="flex items-center gap-2 py-2 px-2 rounded text-12-regular text-text-faint">
      <Icon name={props.icon} size="sm" class="text-icon-base shrink-0" />
      <span>{props.label}</span>
    </div>
  )
}

function PulseLoader() {
  return (
    <div class="flex items-center gap-1.5 py-1.5 px-2 motion-reduce:gap-1">
      <span class="size-1.5 rounded-full bg-v2-icon-icon-accent motion-reduce:bg-v2-icon-icon-accent/50 animate-pulse motion-reduce:animate-none" />
      <span class="size-1.5 rounded-full bg-v2-icon-icon-accent motion-reduce:bg-v2-icon-icon-accent/50 animate-pulse motion-reduce:animate-none" style="animation-delay: 150ms" />
      <span class="size-1.5 rounded-full bg-v2-icon-icon-accent motion-reduce:bg-v2-icon-icon-accent/50 animate-pulse motion-reduce:animate-none" style="animation-delay: 300ms" />
      <span class="text-12-regular text-text-faint ml-1">Loading...</span>
    </div>
  )
}

function Section(props: {
  icon: Parameters<typeof Icon>[0]["name"]
  label: string
  defaultOpen?: boolean
  badge?: string
  loading?: boolean
  children: JSX.Element
}) {
  return (
    <Collapsible defaultOpen={props.defaultOpen ?? true}>
      <Collapsible.Trigger class="flex items-center gap-1.5 w-full px-3 py-1.5 text-13-medium text-text-base hover:bg-v2-surface-hover transition-colors">
        <Collapsible.Arrow />
        <Icon name={props.icon} size="sm" class="text-icon-base shrink-0" />
        <span class="truncate">{props.label}</span>
        <Show when={props.badge}>
          <span class="ml-auto text-11-medium px-1.5 py-0.5 rounded-full bg-v2-surface-selected text-text-weak">{props.badge}</span>
        </Show>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Show when={!props.loading} fallback={<PulseLoader />}>
          <div class="px-3 pb-2 space-y-1.5">
            {props.children}
          </div>
        </Show>
      </Collapsible.Content>
    </Collapsible>
  )
}

function StatusBadge(props: { status: string; active?: string }) {
  const color = () => {
    if (props.status === "active") return "bg-v2-icon-icon-accent/15 text-v2-text-text-accent"
    if (props.status === "ready") return "bg-v2-surface-selected text-text-strong"
    return "bg-v2-surface-muted text-text-faint"
  }
  return (
    <span class={`rounded-full px-1.5 py-0.5 text-11-medium ${color()}`}>
      {props.status}
    </span>
  )
}

function AiExecutionCard(props: { data: AiExecutionData }) {
  const row = (label: string, value: string, icon: Parameters<typeof Icon>[0]["name"]) => (
    <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular hover:bg-v2-surface-hover transition-colors">
      <Icon name={icon} size="sm" class="text-icon-base shrink-0" />
      <span class="text-text-weak shrink-0 w-16">{label}</span>
      <span class="text-text-base truncate">{value || "—"}</span>
    </div>
  )
  return (
    <div class="flex flex-col gap-0.5">
      {row("Task Type", props.data.taskType, "edit")}
      {row("Complexity", props.data.complexity, "outline-sliders")}
      {row("Confidence", props.data.confidence, "check")}
      {row("Strategy", props.data.strategy, "branch")}
      {row("Effort", props.data.effort, "split")}
    </div>
  )
}

function LiveSpecialistCard(props: { data: LiveSpecialistActivity; onAsk: (label: string) => void }) {
  const confidenceColor = () => {
    if (props.data.confidence === "high") return "text-green-500"
    if (props.data.confidence === "medium") return "text-orange-500"
    return "text-text-faint"
  }

  return (
    <div
      class="flex items-center gap-2 py-1 px-2 rounded text-12-regular hover:bg-v2-surface-hover transition-colors cursor-pointer group"
      onClick={() => props.onAsk(props.data.name)}
      tabIndex={0}
      role="button"
      aria-label={`Ask about ${props.data.name}`}
    >
      <div class="relative size-5 shrink-0">
        <div class="size-5 rounded flex items-center justify-center bg-v2-surface-muted">
          <Icon name={props.data.icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base" />
        </div>
        <Show when={props.data.status === "active"}>
          <div class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-v2-icon-icon-accent animate-pulse motion-reduce:animate-none" />
        </Show>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-text-base text-12-medium truncate">{props.data.name}</span>
          <span class={`text-11-regular ${confidenceColor()}`}>
            <Show when={props.data.confidence}>
              {props.data.confidence}
            </Show>
          </span>
        </div>
        <Show when={props.data.currentAction}>
          <div class="text-11-regular text-text-faint truncate">{props.data.currentAction}</div>
        </Show>
        <Show when={props.data.progress !== undefined && props.data.status === "active"}>
          <div class="mt-0.5 h-1 rounded-full bg-v2-surface-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-v2-icon-icon-accent transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${props.data.progress}%` }}
            />
          </div>
        </Show>
      </div>
      <StatusBadge status={props.data.status} />
    </div>
  )
}

function RepoIntelligenceCard(props: { data: RepoIntelligenceData }) {
  return (
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular">
        <Icon name="branch" size="sm" class="text-icon-base shrink-0" />
        <span class="text-text-weak shrink-0 w-16">Branch</span>
        <span class="text-text-base font-medium">{props.data.branch}</span>
      </div>
      <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular">
        <Icon name="filetree" size="sm" class="text-icon-base shrink-0" />
        <span class="text-text-weak shrink-0 w-16">Files</span>
        <span class="text-text-base">{props.data.files}</span>
      </div>
      <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular">
        <Icon name="workspace" size="sm" class="text-icon-base shrink-0" />
        <span class="text-text-weak shrink-0 w-16">Dirs</span>
        <span class="text-text-base">{props.data.dirs}</span>
      </div>
      <Show when={props.data.hasChanges}>
        <div class="flex gap-1 pt-0.5">
          <Show when={props.data.modified > 0}>
            <span class="text-11-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">{props.data.modified}M</span>
          </Show>
          <Show when={props.data.added > 0}>
            <span class="text-11-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">{props.data.added}A</span>
          </Show>
          <Show when={props.data.deleted > 0}>
            <span class="text-11-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">{props.data.deleted}D</span>
          </Show>
        </div>
      </Show>
    </div>
  )
}

function AppIntelligenceCard(props: { data: AppIntelligenceData }) {
  return (
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular">
        <Icon name="workspace" size="sm" class="text-icon-base shrink-0" />
        <span class="text-text-weak shrink-0 w-16">Domain</span>
        <span class="text-text-base">{props.data.domain}</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-11-regular text-text-faint px-2">Modules</div>
        <For each={props.data.modules}>
          {(mod) => (
            <div class="flex items-center justify-between py-1 px-2 rounded text-12-regular hover:bg-v2-surface-hover transition-colors">
              <span class="text-text-base truncate min-w-0 flex-1">{mod.name}</span>
              <StatusBadge status={mod.status} />
            </div>
          )}
        </For>
      </div>
      <Show when={props.data.stack.length > 0}>
        <div class="flex flex-wrap gap-1 px-2 pt-1">
          <For each={props.data.stack}>
            {(s) => <span class="text-11-medium px-1.5 py-0.5 rounded bg-v2-surface-muted text-text-faint">{s}</span>}
          </For>
        </div>
      </Show>
    </div>
  )
}

function AiReasoningCard(props: { items: AiReasoningItem[] }) {
  const variantStyles = (variant: string) => {
    if (variant === "info") return "border-l-v2-icon-icon-accent"
    if (variant === "warning") return "border-l-orange-500"
    if (variant === "success") return "border-l-green-500"
    return "border-l-border-weaker-base"
  }
  const [showRaw, setShowRaw] = createSignal(false)
  const data = useWorkspaceData()
  const rawReasoning = createMemo(() => {
    const allParts = data.parts()
    return allParts
      .filter((p) => p.type === "reasoning")
      .map((p) => (p as { text?: string }).text ?? "")
      .filter(Boolean)
      .join("\n\n")
  })
  return (
    <div class="flex flex-col gap-1.5">
      <For each={props.items}>
        {(item) => (
          <div class={`border-l-2 pl-2 py-1 ${variantStyles(item.variant)}`}>
            <div class="flex items-center gap-1 text-11-regular text-text-weak mb-0.5">
              <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base" />
              <span>{item.label}</span>
            </div>
            <div class="text-12-regular text-text-base leading-snug">{item.value}</div>
          </div>
        )}
      </For>
      <Show when={rawReasoning().length > 0}>
        <button
          type="button"
          class="flex items-center gap-1.5 py-1 px-2 rounded text-12-regular text-text-faint hover:bg-v2-surface-hover transition-colors w-full text-left mt-1"
          onClick={() => setShowRaw(!showRaw())}
        >
          <Icon name={showRaw() ? "collapse" : "expand"} size="sm" class="text-icon-base shrink-0" />
          <span>{showRaw() ? "Hide" : "Show"} raw reasoning ({rawReasoning().length} chars)</span>
        </button>
        <Show when={showRaw()}>
          <pre class="text-11-regular text-text-faint whitespace-pre-wrap font-mono leading-relaxed px-2 py-1 max-h-[200px] overflow-y-auto border border-border-weaker-base rounded">
            {rawReasoning().slice(0, 2000)}
          </pre>
        </Show>
      </Show>
    </div>
  )
}

function AdvancedToolCard(props: { tool: AdvancedTool }) {
  return (
    <div class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors cursor-pointer group" tabIndex={0} role="button">
      <Icon name={props.tool.icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base shrink-0" />
      <div class="min-w-0 flex-1">
        <div class="text-12-medium text-text-strong truncate">{props.tool.label}</div>
        <div class="text-11-regular text-text-faint truncate">{props.tool.description}</div>
      </div>
    </div>
  )
}

function AiTimelineCard(props: { events: TimelineEvent[] }) {
  const typeIcon = (type: string) => {
    if (type === "step") return "split"
    if (type === "agent") return "grid-plus"
    if (type === "reasoning") return "edit"
    if (type === "tool") return "status"
    if (type === "retry") return "reset"
    return "outline-dots"
  }

  const statusColor = (status?: string) => {
    if (status === "error") return "border-l-red-500"
    if (status === "running") return "border-l-v2-icon-icon-accent"
    return "border-l-border-weaker-base"
  }

  return (
    <div class="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
      <For each={props.events.slice(-20)}>
        {(event) => (
          <div class={`border-l-2 pl-2 py-0.5 ${statusColor(event.status)}`}>
            <div class="flex items-center gap-1 text-11-regular text-text-faint">
              <Icon name={typeIcon(event.type) as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base shrink-0" />
              <span class="truncate">{event.label}</span>
              <Show when={event.duration}>
                <span class="ml-auto shrink-0">{(event.duration! / 1000).toFixed(1)}s</span>
              </Show>
            </div>
            <div class="text-11-regular text-text-base truncate">{event.detail}</div>
          </div>
        )}
      </For>
    </div>
  )
}

function AiSuggestionsCard(props: { suggestions: AiSuggestion[] }) {
  const severityColor = (severity: string) => {
    if (severity === "critical") return "border-l-red-500 bg-red-500/5"
    if (severity === "warning") return "border-l-orange-500 bg-orange-500/5"
    return "border-l-v2-icon-icon-accent bg-v2-icon-icon-accent/5"
  }

  const severityIcon = (severity: string) => {
    if (severity === "critical") return "status"
    if (severity === "warning") return "status"
    return "check"
  }

  return (
    <div class="flex flex-col gap-1.5">
      <For each={props.suggestions}>
        {(s) => (
          <div class={`border-l-2 pl-2 py-1 rounded-r ${severityColor(s.severity)}`}>
            <div class="flex items-center gap-1 text-11-regular text-text-weak mb-0.5">
              <Icon name={severityIcon(s.severity) as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base" />
              <span class="font-medium">{s.type}</span>
              <span class="ml-auto text-text-faint">{s.source}</span>
            </div>
            <div class="text-12-regular text-text-base leading-snug">{s.label}</div>
            <div class="text-11-regular text-text-faint mt-0.5">{s.detail}</div>
          </div>
        )}
      </For>
    </div>
  )
}

function SmartFollowUpCard(props: { actions: FollowUpAction[]; onSelect: (action: FollowUpAction) => void }) {
  return (
    <div class="flex flex-col gap-1">
      <For each={props.actions}>
        {(action) => (
          <button
            type="button"
            class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors w-full text-left group"
            onClick={() => props.onSelect(action)}
          >
            <Icon name={action.icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base shrink-0" />
            <span class="truncate">{action.label}</span>
            <Icon name="outline-square-arrow" size="sm" class="text-icon-base shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </For>
    </div>
  )
}

function AiActions() {
  return (
    <div class="flex flex-col gap-1">
      <button type="button" class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors w-full text-left">
        <Icon name="reset" size="sm" class="text-icon-base shrink-0" />
        <span>Reset session context</span>
      </button>
      <button type="button" class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors w-full text-left">
        <Icon name="expand" size="sm" class="text-icon-base shrink-0" />
        <span>Expand all panels</span>
      </button>
      <button type="button" class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors w-full text-left">
        <Icon name="collapse" size="sm" class="text-icon-base shrink-0" />
        <span>Collapse all panels</span>
      </button>
      <button type="button" class="flex items-center gap-2 py-1.5 px-2 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors w-full text-left">
        <Icon name="outline-copy" size="sm" class="text-icon-base shrink-0" />
        <span>Export session summary</span>
      </button>
    </div>
  )
}

function WorkspaceSearch() {
  const data = useWorkspaceData()
  const prompt = usePrompt()
  const [query, setQuery] = createSignal("")
  const [results, setResults] = createSignal<ConversationSearchResult[]>([])

  const search = debounce((q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setResults(data.conversationSearch(q))
  }, 200)

  const handleInput = (q: string) => {
    setQuery(q)
    search(q)
  }

  const handleResultClick = (result: ConversationSearchResult) => {
    const current = prompt.current()
    const text = result.text.slice(0, 200)
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: `Go to: ${result.text.slice(0, 100)}` }])
    } else {
      prompt.set([{ type: "text", content: `Go to: ${result.text.slice(0, 100)}`, start: 0, end: 0 }])
    }
  }

  const hasResults = () => results().length > 0
  const isSearching = () => query().trim().length > 0 && !hasResults()

  return (
    <div class="border-b border-border-weaker-base">
      <div class="px-3 py-1.5">
        <div class="flex items-center gap-1 px-2 py-1 rounded bg-v2-surface-muted text-12-regular text-text-faint">
          <Icon name="magnifying-glass" size="sm" class="text-icon-base shrink-0" />
          <input
            type="text"
            value={query()}
            onInput={(e) => handleInput(e.currentTarget.value)}
            placeholder="Search workspace..."
            class="flex-1 bg-transparent border-none outline-none text-12-regular text-text-base placeholder:text-text-faint min-w-0"
          />
          <Show when={query()}>
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]) }}
              class="size-4 flex items-center justify-center rounded hover:bg-v2-surface-hover"
              aria-label="Clear search"
            >
              <Icon name="xmark-small" size="sm" class="text-icon-base" />
            </button>
          </Show>
        </div>
        <Show when={hasResults()}>
          <div class="mt-1 max-h-[160px] overflow-y-auto">
            <For each={results().slice(0, 10)}>
              {(result) => (
                <div
                  class="flex items-center gap-1.5 py-0.5 px-1 rounded text-12-regular text-text-base hover:bg-v2-surface-hover transition-colors cursor-pointer truncate"
                  onClick={() => handleResultClick(result)}
                  tabIndex={0}
                  role="button"
                >
                  <Icon
                    name={result.role === "reasoning" ? "edit" : result.role === "user" ? "edit" : "check"}
                    size="sm"
                    class="text-icon-base shrink-0"
                  />
                  <span class="truncate flex-1">{result.text.slice(0, 80)}</span>
                  <span class="text-11-regular text-text-faint shrink-0">{result.role}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={isSearching()}>
          <div class="text-12-regular text-text-faint italic mt-1">Searching...</div>
        </Show>
      </div>
    </div>
  )
}

function ContextAwarenessBar() {
  const { sessionID, sessionInfo, messages } = useWorkspaceData()

  const currentContext = createMemo(() => {
    const sid = sessionID()
    if (!sid) return { file: "", folder: "", module: "", language: "" }
    const info = sessionInfo()
    const title = info?.title ?? ""
    const msgs = messages()
    const userMsgs = msgs.filter((m) => m.role === "user")
    const lastUser = userMsgs[userMsgs.length - 1]
    const agent = lastUser
      ? ((lastUser as { agent?: string }).agent ?? "")
      : ""
    const model = info?.model?.id ?? ""
    return {
      file: title,
      folder: info?.path ?? agent,
      module: agent,
      language: model,
    }
  })

  const badge = (label: string, value: string) => (
    <Show when={value}>
      <div class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-v2-surface-muted">
        <span class="text-11-medium text-text-faint uppercase">{label}</span>
        <span class="text-11-regular text-text-base max-w-[100px] truncate">{value}</span>
      </div>
    </Show>
  )

  return (
    <Show when={sessionID()}>
      <div class="shrink-0 px-3 py-1.5 flex items-center gap-1.5 border-b border-border-weaker-base overflow-x-auto">
        <Icon name="status-active" size="sm" class="text-icon-base shrink-0" />
        {badge("AGENT", currentContext().module)}
        {badge("MODEL", currentContext().language)}
      </div>
    </Show>
  )
}

export function AIWorkspace() {
  const data = useWorkspaceData()
  const prompt = usePrompt()

  const execution = createMemo(() => data.executionData())

  const handleFollowUp = (action: FollowUpAction) => {
    const current = prompt.current()
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: action.prompt }])
    } else {
      prompt.set([{ type: "text", content: action.prompt, start: 0, end: action.prompt.length }])
    }
    showToast({ title: "Prompt set", message: `Follow-up action: ${action.label}`, variant: "info" })
  }

  const handleAskAbout = (label: string) => {
    const promptText = `Tell me more about what ${label} is doing.`
    const current = prompt.current()
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: promptText }])
    } else {
      prompt.set([{ type: "text", content: promptText, start: 0, end: promptText.length }])
    }
    showToast({ title: "Click-to-Ask", message: `Ask about ${label}`, variant: "info" })
  }

  const handleSuggestionAction = (suggestion: AiSuggestion) => {
    const current = prompt.current()
    const promptText = `Analyze: ${suggestion.label} - ${suggestion.detail}`
    const textPart = current.find((p) => p.type === "text")
    if (textPart) {
      prompt.set([{ ...textPart, content: promptText }])
    } else {
      prompt.set([{ type: "text", content: promptText, start: 0, end: promptText.length }])
    }
    showToast({ title: "Suggestion selected", message: suggestion.label, variant: "info" })
  }

  return (
    <div class="flex flex-col h-full bg-v2-background-bg-deep overflow-hidden">
      <div class="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-border-weaker-base">
        <Icon name="sidebar-right" size="sm" class="text-icon-base shrink-0" />
        <span class="text-13-medium text-text-strong truncate">AI Workspace</span>
        <Show when={data.sessionID()}>
          <span class="ml-auto size-1.5 rounded-full bg-v2-icon-icon-accent" classList={{
            "animate-pulse motion-reduce:animate-none": data.sessionStatus() === "busy",
          }} />
        </Show>
      </div>
      <ContextAwarenessBar />
      <WorkspaceSearch />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <Section icon="edit" label="AI Execution" defaultOpen badge={execution().taskType}>
          <AiExecutionCard data={execution()} />
        </Section>
        <Section icon="outline-dots" label="Notifications" defaultOpen={false} badge={`${data.notifications().length}`}>
          <Show when={data.notifications().length > 0} fallback={
            <EmptyState icon="check" label="No notifications" />
          }>
            <For each={data.notifications()}>
              {(n) => (
              <div class="flex items-start gap-2 py-1 px-2 rounded text-12-regular">
                <Icon
                  name={n.type === "error" ? "status" : n.type === "warning" ? "status" : "check"}
                  size="sm"
                  class={`shrink-0 mt-0.5 ${n.type === "error" ? "text-red-500" : n.type === "warning" ? "text-orange-500" : "text-green-500"}`}
                />
                <div class="min-w-0 flex-1">
                  <div class="text-text-base text-12-medium">{n.label}</div>
                  <div class="text-11-regular text-text-faint">{n.detail}</div>
                </div>
              </div>
            )}
          </For>
          </Show>
        </Section>
        <Section icon="bookmark" label="Bookmarked Messages" defaultOpen={false} badge={`${data.bookmarkedMessages().length}`}>
          <Show when={data.bookmarkedMessages().length > 0} fallback={
            <EmptyState icon="bookmark" label="No bookmarked messages" />
          }>
            <div class="flex flex-col gap-1">
              <For each={data.bookmarkedMessages().slice(0, 10)}>
                {(bm) => (
                  <div class="flex items-center gap-1.5 py-1 px-2 rounded text-12-regular hover:bg-v2-surface-hover transition-colors cursor-pointer" tabIndex={0} role="button">
                    <Icon name="bookmark" size="sm" class="text-icon-base shrink-0" />
                    <span class="truncate flex-1 text-text-base">{bm.text.slice(0, 80) || `[${bm.role}]`}</span>
                    <span class="text-11-regular text-text-faint shrink-0">{bm.role}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Section>
        <Section icon="grid-plus" label="Specialist Team" defaultOpen={false} loading={data.sessionStatus() === "busy"}>
          <div class="flex flex-col gap-1">
            <For each={data.liveSpecialistData()}>
              {(s) => <LiveSpecialistCard data={s} onAsk={handleAskAbout} />}
            </For>
          </div>
        </Section>
        <Section icon="outline-dots" label="AI Timeline" defaultOpen={false} badge={`${data.timelineData().length}`} loading={data.sessionStatus() === "busy"}>
          <Show when={data.timelineData().length > 0} fallback={
            <EmptyState icon="outline-dots" label="No timeline events yet" />
          }>
            <AiTimelineCard events={data.timelineData()} />
          </Show>
        </Section>
        <Section icon="status" label="AI Suggestions" defaultOpen={false} badge={`${data.suggestionsData().length}`}>
          <Show when={data.suggestionsData().length > 0} fallback={
            <EmptyState icon="check" label="No active suggestions" />
          }>
            <AiSuggestionsCard suggestions={data.suggestionsData()} />
          </Show>
        </Section>
        <Section icon="outline-square-arrow" label="Smart Follow-up" defaultOpen={false} badge={`${data.followUpData().length}`}>
          <Show when={data.followUpData().length > 0} fallback={
            <EmptyState icon="outline-square-arrow" label="No follow-up actions available" />
          }>
            <SmartFollowUpCard actions={data.followUpData()} onSelect={handleFollowUp} />
          </Show>
        </Section>
        <Section icon="branch" label="Repo Intelligence" defaultOpen={false}>
          <RepoIntelligenceCard data={data.repoData()} />
        </Section>
        <Section icon="workspace" label="App Intelligence" defaultOpen={false}>
          <AppIntelligenceCard data={data.appData()} />
        </Section>
        <Section icon="edit" label="AI Reasoning" defaultOpen={false} loading={data.sessionStatus() === "busy"}>
          <AiReasoningCard items={data.reasoningData()} />
        </Section>
        <Section icon="outline-sliders" label="Advanced Intelligence" defaultOpen={false}>
          <div class="flex flex-col gap-1">
            <For each={data.advancedData()}>
              {(tool) => <AdvancedToolCard tool={tool} />}
            </For>
          </div>
        </Section>
        <Section icon="outline-dots" label="AI Workspace Actions" defaultOpen={false}>
          <AiActions />
        </Section>
      </div>
    </div>
  )
}
