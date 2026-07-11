import { For, Show, createMemo, type JSX } from "solid-js"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { useWorkspaceData, type AiReasoningItem, type AdvancedTool, type AiExecutionData, type RepoIntelligenceData, type AppIntelligenceData, type SpecialistInfo } from "./use-workspace-data"

function Section(props: {
  icon: Parameters<typeof Icon>[0]["name"]
  label: string
  defaultOpen?: boolean
  badge?: string
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
        <div class="px-3 pb-2 space-y-1.5">
          {props.children}
        </div>
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

function SpecialistCard(props: { data: SpecialistInfo }) {
  return (
    <div class="flex items-center gap-2 py-1 px-2 rounded text-12-regular hover:bg-v2-surface-hover transition-colors">
      <div class="size-5 rounded flex items-center justify-center bg-v2-surface-muted shrink-0">
        <Icon name={props.data.icon as Parameters<typeof Icon>[0]["name"]} size="sm" class="text-icon-base" />
      </div>
      <span class="flex-1 min-w-0 truncate text-text-base">{props.data.name}</span>
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

function ContextAwarenessBar() {
  const { sessionID, sessionInfo, messages, parts } = useWorkspaceData()

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

  const execution = createMemo(() => {
    const d = data.executionData()
    return d
  })

  return (
    <div class="flex flex-col h-full bg-v2-background-bg-deep overflow-hidden">
      <div class="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-border-weaker-base">
        <Icon name="sidebar-right" size="sm" class="text-icon-base shrink-0" />
        <span class="text-13-medium text-text-strong truncate">AI Workspace</span>
        <Show when={data.sessionID()}>
          <span class="ml-auto size-1.5 rounded-full bg-v2-icon-icon-accent" />
        </Show>
      </div>
      <ContextAwarenessBar />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <Section icon="edit" label="AI Execution" defaultOpen badge={execution().taskType}>
          <AiExecutionCard data={execution()} />
        </Section>
        <Section icon="grid-plus" label="Specialist Team" defaultOpen={false}>
          <div class="flex flex-col gap-1">
            <For each={data.specialistData()}>
              {(s) => <SpecialistCard data={s} />}
            </For>
          </div>
        </Section>
        <Section icon="branch" label="Repo Intelligence" defaultOpen={false}>
          <RepoIntelligenceCard data={data.repoData()} />
        </Section>
        <Section icon="workspace" label="App Intelligence" defaultOpen={false}>
          <AppIntelligenceCard data={data.appData()} />
        </Section>
        <Section icon="edit" label="AI Reasoning" defaultOpen={false}>
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
