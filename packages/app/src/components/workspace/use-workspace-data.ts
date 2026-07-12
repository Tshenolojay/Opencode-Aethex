import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { useParams } from "@solidjs/router"
import { useSync } from "@/context/sync"
import { useFile } from "@/context/file"
import { useSDK } from "@/context/sdk"
import { useServerSync } from "@/context/server-sync"
import { useLayout } from "@/context/layout"
import { getFilename } from "@opencode-ai/core/util/path"

export type Complexity = "low" | "medium" | "high"
export type Confidence = "low" | "medium" | "high"
export type SpecialistStatus = "active" | "ready" | "idle"

export type SpecialistInfo = {
  name: string
  icon: string
  status: SpecialistStatus
  description: string
}

export type LiveSpecialistActivity = SpecialistInfo & {
  confidence?: Confidence
  currentAction?: string
  progress?: number
  stepLabel?: string
}

export type AiExecutionData = {
  goal: string
  taskType: string
  complexity: Complexity
  confidence: Confidence
  strategy: string
  effort: string
}

export type RepoIntelligenceData = {
  branch: string
  files: number
  dirs: number
  modified: number
  added: number
  deleted: number
  hasChanges: boolean
  summary: string
}

export type AppIntelligenceData = {
  name: string
  domain: string
  modules: { name: string; status: string }[]
  services: string[]
  stack: string[]
}

export type AiReasoningItem = {
  label: string
  value: string
  icon: string
  variant: "info" | "warning" | "success" | "neutral"
}

export type AdvancedTool = {
  label: string
  icon: string
  description: string
}

export type TimelineEvent = {
  id: string
  type: "step" | "agent" | "reasoning" | "tool" | "retry" | "compaction"
  label: string
  detail: string
  time: number
  duration?: number
  status?: "running" | "completed" | "error"
}

export type AiSuggestion = {
  id: string
  type: "refactor" | "unused-import" | "architecture" | "performance" | "security" | "style"
  label: string
  detail: string
  severity: "info" | "warning" | "critical"
  source: string
}

export type FollowUpAction = {
  id: string
  label: string
  icon: string
  prompt: string
}

export type IndexedState = {
  indexed: boolean
  indexing: boolean
  totalFiles: number
  indexedFiles: number
  model: string
  agent: string
  strategy: string
  memory: string
}

export type FileAction = {
  id: string
  label: string
  icon: string
  prompt: string
}

export type RecentFile = {
  path: string
  name: string
  action: "modified" | "reviewed" | "analysed" | "favorite"
  timestamp: number
}

export type ConversationSearchResult = {
  id: string
  type: "message" | "part"
  role?: string
  text: string
  time: number
}

export type RelatedFileInfo = {
  path: string
  name: string
  relation: "same-message" | "imported" | "exported"
}

export type NotificationItem = {
  id: string
  type: "success" | "warning" | "error" | "info"
  label: string
  detail: string
  timestamp: number
  source: string
}

const BOOKMARKS_KEY = "opencode-workspace-bookmarks"

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveBookmarks(ids: Set<string>): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...ids]))
  } catch {
    /* noop */
  }
}

export function useWorkspaceData() {
  const params = useParams()
  const sync = useSync()
  const file = useFile()
  const sdk = useSDK()
  const serverSync = useServerSync()
  const layout = useLayout()

  const dirSync = createMemo(() => {
    const dir = sdk().directory
    if (!dir) return undefined
    return serverSync().child(dir)[0]
  })

  const sessionInfo = createMemo(() => {
    if (!params.id) return undefined
    return sync().session.get(params.id)
  })

  const messages = createMemo(() => {
    if (!params.id) return []
    return sync().data.message[params.id] ?? []
  })

  const parts = createMemo(() => messages().flatMap((m) => sync().data.part[m.id] ?? []))

  const sessionStatus = createMemo(() => {
    if (!params.id) return "idle" as const
    return sync().data.session_status[params.id]?.type ?? "idle"
  })

  const project = createMemo(() => {
    const dir = sdk().directory
    if (!dir) return undefined
    return layout.projects.list().find((p) => p.worktree === dir || p.sandboxes?.includes(dir))
  })

  const vcs = createMemo(() => dirSync()?.vcs)

  const aiExecution = (): AiExecutionData => {
    const info = sessionInfo()
    const msgs = messages()
    const userMsgs = msgs.filter((m) => m.role === "user")
    const lastUserMsg = userMsgs[userMsgs.length - 1]
    const currentParts = parts()
    const agents = currentParts.filter((p) => p.type === "agent")
    const lastAgent = agents[agents.length - 1]
    const tokenInfo = info?.tokens
    const costInfo = info?.cost

    const goal: string =
      (lastUserMsg as { summary?: { title?: string } })?.summary?.title ??
      (lastUserMsg as { system?: string })?.system ??
      ""

    const taskType = goal.length > 200 ? "analysis" : goal.length > 80 ? "coding" : "inquiry"

    const totals = tokenInfo
      ? tokenInfo.input + tokenInfo.output
      : 0
    const complexity: Complexity = totals > 5000 ? "high" : totals > 500 ? "medium" : "low"
    const confidence: Confidence = sessionStatus() === "busy" ? "medium" : "high"

    const strategy = lastAgent?.type === "agent" ? lastAgent.name : (info?.agent ?? "auto")

    const effort = tokenInfo
      ? `${((tokenInfo.input + tokenInfo.output) / 1000).toFixed(1)}k tokens`
      : costInfo
        ? `$${costInfo.toFixed(4)}`
        : ""

    return { goal, taskType, complexity, confidence, strategy, effort }
  }

  const executionData = createMemo(aiExecution)

  const specialists = (): SpecialistInfo[] => {
    const agents = parts().filter((p) => p.type === "agent")
    const agentNames = new Set(agents.map((p) => (p as { name: string }).name))

    const all: SpecialistInfo[] = [
      { name: "Analyzer", icon: "magnifying-glass", description: "Code and requirement analysis", status: "idle" },
      { name: "Researcher", icon: "branch", description: "Context and dependency research", status: "idle" },
      { name: "Coder", icon: "edit", description: "Implementation and code generation", status: "idle" },
      { name: "Reviewer", icon: "review", description: "Code review and quality checks", status: "idle" },
      { name: "Tester", icon: "check", description: "Test generation and execution", status: "idle" },
      { name: "Debugger", icon: "magnifying-glass", description: "Bug diagnosis and fixing", status: "idle" },
      { name: "Optimizer", icon: "split", description: "Performance optimization", status: "idle" },
      { name: "Integrator", icon: "workspace", description: "Integration and deployment", status: "idle" },
    ]

    return all.map((s) => ({
      ...s,
      status: agentNames.has(s.name)
        ? "active"
        : s.name === "Analyzer" || s.name === "Coder"
          ? "ready"
          : ("idle" as SpecialistStatus),
    }))
  }

  const specialistData = createMemo(specialists)

  const liveSpecialistActivity = (): LiveSpecialistActivity[] => {
    const base = specialists()
    const allParts = parts()
    const currentSteps = allParts.filter((p) => p.type === "step-start")
    const finishedSteps = allParts.filter((p) => p.type === "step-finish")
    const runningTools = allParts.filter(
      (p) => p.type === "tool" && (p as { state?: { status?: string } }).state?.status === "running"
    )
    const toolBases = runningTools.map((t) => {
      const tool = t as { tool?: string; state?: { title?: string } }
      return { name: tool.tool ?? "", title: tool.state?.title ?? "" }
    })

    return base.map((s) => {
      const step = currentSteps.findLast(() => true)
      const stepLabel = step ? (step as { snapshot?: string }).snapshot?.slice(0, 60) : undefined
      const isActive = s.status === "active"
      const currentAction = isActive
        ? toolBases.map((t) => t.title).filter(Boolean).join(", ") || `${s.name} working...`
        : undefined
      const activeDuration = currentSteps.length - finishedSteps.length
      const progress = isActive ? Math.min((finishedSteps.length / Math.max(currentSteps.length, 1)) * 100, 95) : undefined

      return {
        ...s,
        confidence: isActive ? "medium" as Confidence : s.status === "ready" ? "high" as Confidence : undefined,
        currentAction,
        progress,
        stepLabel: isActive ? stepLabel : undefined,
      }
    })
  }

  const liveSpecialistData = createMemo(liveSpecialistActivity)

  const repoIntelligence = (): RepoIntelligenceData => {
    const v = vcs()
    const branch = v?.branch ?? "main"
    let files = 0
    let dirs = 0
    const tree = file.tree
    const root = sdk().directory
    if (root) {
      const state = tree.state("")
      files = state?.files ?? tree.children("").length
      dirs = state?.dirs ?? 0
    }
    const diffs = params.id ? sync().data.session_diff[params.id] ?? [] : []
    const mod = diffs.filter((d) => d.status === "modified").length
    const add = diffs.filter((d) => d.status === "added").length
    const del = diffs.filter((d) => d.status === "deleted").length
    const hasChanges = diffs.length > 0

    const summary = `${branch} (${files} files, ${dirs} dirs)`

    return { branch, files, dirs, modified: mod, added: add, deleted: del, hasChanges, summary }
  }

  const repoData = createMemo(repoIntelligence)

  const appIntelligence = (): AppIntelligenceData => {
    const dir = sdk().directory
    const proj = project()
    const name = proj?.name || (dir ? getFilename(dir) : "Workspace")
    const domain = dir?.includes("packages") ? "monorepo" : dir?.includes("src") ? "web" : "general"
    const msgs = messages()
    const srcDirs = new Set<string>()
    for (const m of msgs) {
      if (m.role !== "assistant") continue
      const msg = m as { path?: { root?: string } }
      if (msg.path?.root) {
        const partsList = msg.path.root.split("/").filter(Boolean)
        if (partsList[0]) srcDirs.add(partsList[0])
      }
    }
    const mods = srcDirs.size === 0 && dir
      ? [{ name: getFilename(dir), status: "active" }]
      : [...srcDirs].map((d) => ({ name: d, status: "active" }))
    const services = ["Tool Execution", "File System", "VCS Integration"]
    const stack = ["TypeScript", "SolidJS"]

    return { name, domain, modules: mods, services, stack }
  }

  const appData = createMemo(appIntelligence)

  const aiReasoning = (): AiReasoningItem[] => {
    const msgs = messages()
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant")
    if (!lastAssistant) {
      return [
        { label: "Mission", value: "Awaiting task", icon: "edit", variant: "neutral" },
        { label: "Plan", value: "No active plan", icon: "grid-plus", variant: "neutral" },
        { label: "Risks", value: "None identified", icon: "status", variant: "success" },
        { label: "Recommendation", value: "Start a new task", icon: "check", variant: "neutral" },
      ]
    }
    const reasoningParts = lastAssistant
      ? sync().data.part[lastAssistant.id]?.filter((p) => p.type === "reasoning") ?? []
      : []
    const textParts = lastAssistant
      ? sync().data.part[lastAssistant.id]?.filter((p) => p.type === "text") ?? []
      : []
    const reasoningText = reasoningParts.map((p) => (p as { text?: string }).text ?? "").join(" ").slice(0, 120)
    const responseText = textParts.map((p) => (p as { text?: string }).text ?? "").join(" ").slice(0, 120)
    const hasReasoning = reasoningParts.length > 0
    const info = sessionInfo()
    const isBusy = sessionStatus() === "busy"

    const plan = reasoningText || (isBusy ? "Reasoning in progress..." : "Plan ready")
    const mission = responseText || (info?.title ?? "") || "Active session"
    const recommendation = !isBusy && responseText ? responseText : isBusy ? "Processing..." : "No output yet"

    const tokenRisk = info?.tokens && info.tokens.input > 10000 ? "High token usage" : undefined
    const errors = lastAssistant
      ? (sync().data.part[lastAssistant.id]?.filter((p) => p.type === "tool" && (p as { state?: { status?: string } }).state?.status === "error") ?? [])
      : []
    const riskText = errors.length > 0 ? `${errors.length} tool error(s)` : tokenRisk ?? "None"

    return [
      { label: "Mission", value: mission.slice(0, 100), icon: "edit", variant: isBusy ? "info" : "success" },
      { label: "Plan", value: plan.slice(0, 100), icon: "grid-plus", variant: hasReasoning ? "info" : "neutral" },
      { label: "Risks", value: riskText, icon: "status", variant: errors.length > 0 ? "warning" : "success" },
      { label: "Recommendation", value: recommendation.slice(0, 120), icon: "check", variant: isBusy ? "info" : "success" },
    ]
  }

  const reasoningData = createMemo(aiReasoning)

  const advancedTools = (): AdvancedTool[] => [
    { label: "Code Search", icon: "magnifying-glass", description: "Search across the entire codebase for patterns, symbols, and text" },
    { label: "Dependency Graph", icon: "workspace", description: "Visualize module dependencies and import relationships" },
    { label: "Performance Insights", icon: "split", description: "Token usage analytics and response time metrics" },
    { label: "Security Analysis", icon: "status", description: "Identify potential security vulnerabilities in code" },
    { label: "Duplicate Detection", icon: "review", description: "Find duplicate code blocks and similar patterns" },
    { label: "Coverage Analysis", icon: "check", description: "Track test coverage across the codebase" },
  ]

  const advancedData = createMemo(advancedTools)

  const aiTimelineEvents = (): TimelineEvent[] => {
    const allParts = parts()
    const msgs = messages()
    const events: TimelineEvent[] = []

    for (const p of allParts) {
      if (p.type === "step-start") {
        events.push({
          id: p.id,
          type: "step",
          label: "Step Started",
          detail: (p as { snapshot?: string }).snapshot ?? "Processing",
          time: (p as { time?: { start?: number } }).time?.start ?? Date.now(),
          status: "running",
        })
      } else if (p.type === "step-finish") {
        const sf = p as { reason?: string; time?: { start?: number; end?: number }; tokens?: { total?: number } }
        events.push({
          id: p.id,
          type: "step",
          label: "Step Finished",
          detail: sf.reason ?? "Completed",
          time: sf.time?.end ?? Date.now(),
          duration: sf.time?.start && sf.time?.end ? sf.time.end - sf.time.start : undefined,
          status: sf.reason === "error" ? "error" : "completed",
        })
      } else if (p.type === "agent") {
        events.push({
          id: p.id,
          type: "agent",
          label: "Agent Active",
          detail: (p as { name: string }).name,
          time: (p as { time?: { start?: number } }).time?.start ?? (p as { start?: number }).start ?? Date.now(),
          status: "completed",
        })
      } else if (p.type === "reasoning") {
        events.push({
          id: p.id,
          type: "reasoning",
          label: "Reasoning",
          detail: (p as { text?: string }).text?.slice(0, 80) ?? "",
          time: (p as { time?: { start?: number } }).time?.start ?? Date.now(),
          status: "completed",
        })
      } else if (p.type === "retry") {
        events.push({
          id: p.id,
          type: "retry",
          label: "Retry",
          detail: `Attempt ${(p as { attempt?: number }).attempt}`,
          time: (p as { time?: { created?: number } }).time?.created ?? Date.now(),
          status: "error",
        })
      }
    }

    events.sort((a, b) => a.time - b.time)
    return events.slice(-50)
  }

  const timelineData = createMemo(aiTimelineEvents)

  const aiSuggestions = (): AiSuggestion[] => {
    const msgs = messages()
    const allParts = parts()
    const suggestions: AiSuggestion[] = []

    const errors = allParts.filter(
      (p) => p.type === "tool" && (p as { state?: { status?: string } }).state?.status === "error"
    )
    if (errors.length > 0) {
      suggestions.push({
        id: "tool-errors",
        type: "architecture",
        label: "Tool execution errors",
        detail: `${errors.length} tool(s) encountered errors. Consider reviewing the execution context.`,
        severity: errors.length > 3 ? "critical" : "warning",
        source: "Workspace Intelligence",
      })
    }

    const tokenInfo = sessionInfo()?.tokens
    if (tokenInfo && tokenInfo.input > 15000) {
      suggestions.push({
        id: "high-token-usage",
        type: "performance",
        label: "High token consumption",
        detail: `Input tokens (${tokenInfo.input.toLocaleString()}) exceed 15k. Consider compacting the session.`,
        severity: "warning",
        source: "Token Monitor",
      })
    }

    const diffCount = params.id ? (sync().data.session_diff[params.id]?.length ?? 0) : 0
    if (diffCount > 10) {
      suggestions.push({
        id: "large-diff",
        type: "refactor",
        label: "Large change set",
        detail: `${diffCount} files modified. Consider committing or reviewing changes.`,
        severity: "info",
        source: "VCS Monitor",
      })
    }

    return suggestions
  }

  const suggestionsData = createMemo(aiSuggestions)

  const smartFollowUp = (): FollowUpAction[] => {
    const info = sessionInfo()
    const status = sessionStatus()
    if (status === "busy" || !info) return []

    const actions: FollowUpAction[] = [
      {
        id: "review-changes",
        label: "Review changes",
        icon: "review",
        prompt: "Review the changes made so far and provide a summary.",
      },
      {
        id: "continue-task",
        label: "Continue task",
        icon: "edit",
        prompt: "Continue working on the current task. What's the next step?",
      },
      {
        id: "explain-code",
        label: "Explain code",
        icon: "help",
        prompt: "Explain the code that was just modified or created.",
      },
      {
        id: "find-issues",
        label: "Find issues",
        icon: "status",
        prompt: "Analyze the codebase for potential issues, bugs, or improvements.",
      },
    ]

    const diffCount = params.id ? (sync().data.session_diff[params.id]?.length ?? 0) : 0
    if (diffCount > 0) {
      actions.unshift({
        id: "summarize-changes",
        label: "Summarize changes",
        icon: "grid-plus",
        prompt: "Provide a brief summary of all changes made in this session.",
      })
    }

    return actions
  }

  const followUpData = createMemo(smartFollowUp)

  const indexedState = (): IndexedState => {
    const info = sessionInfo()
    const dir = sdk().directory
    const tree = file.tree
    let totalFiles = 0
    if (dir) {
      const state = tree.state("")
      totalFiles = state?.files ?? 0
    }
    return {
      indexed: totalFiles > 0,
      indexing: false,
      totalFiles,
      indexedFiles: totalFiles,
      model: info?.model?.id ?? "auto",
      agent: info?.agent ?? "auto",
      strategy: executionData().strategy,
      memory: info?.tokens
        ? `${((info.tokens.input + info.tokens.output) / 1000).toFixed(0)}k`
        : "—",
    }
  }

  const indexedStateData = createMemo(indexedState)

  const filePreviewActions = (filePath: string | undefined): FileAction[] => {
    if (!filePath) return []
    return [
      { id: "preview", label: "Preview", icon: "monitor", prompt: `Show me a preview of ${filePath}` },
      { id: "explain", label: "Explain", icon: "help", prompt: `Explain what ${filePath} does and its key components` },
      { id: "summarize", label: "Summarize", icon: "grid-plus", prompt: `Summarize the contents of ${filePath}` },
      { id: "trace", label: "Trace", icon: "branch", prompt: `Trace the dependencies and references of ${filePath}` },
      { id: "review", label: "Review", icon: "review", prompt: `Review ${filePath} for potential issues and improvements` },
      { id: "references", label: "Find References", icon: "magnifying-glass", prompt: `Find all references to symbols defined in ${filePath}` },
    ]
  }

  const favoriteFiles = (): RecentFile[] => {
    const msgs = messages()
    const seen = new Set<string>()
    const files: RecentFile[] = []

    for (const m of msgs) {
      if (m.role !== "assistant") continue
      const msgParts = sync().data.part[m.id] ?? []
      for (const p of msgParts) {
        if (p.type === "file") {
          const fp = p as { filename?: string; url?: string }
          const name = fp.filename || getFilename(fp.url ?? "")
          if (name && !seen.has(name)) {
            seen.add(name)
            files.push({
              path: fp.url ?? name,
              name,
              action: "reviewed",
              timestamp: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
            })
          }
        }
        if (p.type === "patch") {
          const pp = p as { files?: string[] }
          for (const f of pp.files ?? []) {
            if (!seen.has(f)) {
              seen.add(f)
              files.push({
                path: f,
                name: getFilename(f),
                action: "modified",
                timestamp: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
              })
            }
          }
        }
      }
    }

    files.sort((a, b) => b.timestamp - a.timestamp)
    return files.slice(0, 20)
  }

  const favoriteFilesData = createMemo(favoriteFiles)

  const fileRelatedFiles = (filePath: string | undefined): RelatedFileInfo[] => {
    if (!filePath) return []
    const msgs = messages()
    const related: RelatedFileInfo[] = []
    const seen = new Set<string>()

    const fileName = filePath.split("/").pop() ?? filePath
    for (const m of msgs) {
      if (m.role !== "assistant") continue
      const msgParts = sync().data.part[m.id] ?? []
      const hasTarget = msgParts.some(
        (p) =>
          (p.type === "file" && (p as { filename?: string }).filename === fileName) ||
          (p.type === "patch" && (p as { files?: string[] }).files?.some((f) => f.includes(fileName)))
      )
      if (!hasTarget) continue
      for (const p of msgParts) {
        if (p.type === "file") {
          const fn = (p as { filename?: string }).filename
          if (fn && fn !== fileName && !seen.has(fn)) {
            seen.add(fn)
            related.push({ path: fn, name: fn, relation: "same-message" })
          }
        }
        if (p.type === "patch") {
          for (const f of (p as { files?: string[] }).files ?? []) {
            const fName = f.split("/").pop() ?? f
            if (fName !== fileName && !seen.has(f)) {
              seen.add(f)
              related.push({ path: f, name: fName, relation: "same-message" })
            }
          }
        }
      }
    }

    return related.slice(0, 10)
  }

  const fileImportedModules = (_filePath: string | undefined): string[] => {
    const rel = fileRelatedFiles(_filePath)
    const mods = new Set<string>()
    for (const r of rel) {
      const partsList = r.path.split("/")
      if (partsList[0]) mods.add(partsList[0])
    }
    return [...mods].slice(0, 5)
  }

  const [bookmarkStore, setBookmarkStore] = createStore({ ids: loadBookmarks() })

  const persistBookmarks = () => saveBookmarks(bookmarkStore.ids)

  const addBookmark = (id: string) => {
    setBookmarkStore("ids", (prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    persistBookmarks()
  }

  const removeBookmark = (id: string) => {
    setBookmarkStore("ids", (prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    persistBookmarks()
  }

  const isBookmarked = (id: string) => bookmarkStore.ids.has(id)

  const bookmarkedMessages = createMemo(() => {
    const ids = bookmarkStore.ids
    if (ids.size === 0) return []
    const msgs = messages()
    return msgs
      .filter((m) => ids.has(m.id))
      .map((m) => {
        const textParts = sync().data.part[m.id]?.filter((p) => p.type === "text") ?? []
        const text = textParts.map((p) => (p as { text?: string }).text ?? "").join(" ").slice(0, 120)
        return {
          id: m.id,
          role: m.role,
          text,
          time: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
        }
      })
      .sort((a, b) => b.time - a.time)
  })

  const notifications = createMemo((): NotificationItem[] => {
    const sug = suggestionsData()
    const items: NotificationItem[] = []
    const now = Date.now()

    for (const s of sug) {
      items.push({
        id: s.id,
        type: s.severity === "critical" ? "error" : s.severity === "warning" ? "warning" : "info",
        label: s.label,
        detail: s.detail,
        timestamp: now,
        source: s.source,
      })
    }

    if (sessionStatus() === "busy") {
      items.push({
        id: "session-busy",
        type: "info",
        label: "Session active",
        detail: "AI is currently processing your request",
        timestamp: now,
        source: "Session Monitor",
      })
    }

    const state = indexedStateData()
    if (state.indexed && state.totalFiles > 0) {
      items.push({
        id: "workspace-indexed",
        type: "success",
        label: "Workspace indexed",
        detail: `${state.indexedFiles}/${state.totalFiles} files available`,
        timestamp: now,
        source: "Indexer",
      })
    }

    return items
  })

  const conversationSearch = (query: string): ConversationSearchResult[] => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const msgs = messages()
    const results: ConversationSearchResult[] = []

    for (const m of msgs) {
      const role = m.role
      const msgParts = sync().data.part[m.id] ?? []
      for (const p of msgParts) {
        if (p.type === "text") {
          const text = (p as { text?: string }).text ?? ""
          if (text.toLowerCase().includes(q)) {
            results.push({
              id: p.id,
              type: "part",
              role,
              text: text.slice(0, 200),
              time: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
            })
          }
        }
        if (p.type === "reasoning") {
          const text = (p as { text?: string }).text ?? ""
          if (text.toLowerCase().includes(q)) {
            results.push({
              id: p.id,
              type: "part",
              role: "reasoning",
              text: text.slice(0, 200),
              time: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
            })
          }
        }
      }
      if (m.role === "user") {
        const sys = (m as { system?: string }).system ?? ""
        if (sys.toLowerCase().includes(q)) {
          results.push({
            id: m.id,
            type: "message",
            role: "user",
            text: sys.slice(0, 200),
            time: (m as { time?: { created?: number } }).time?.created ?? Date.now(),
          })
        }
      }
    }

    results.sort((a, b) => b.time - a.time)
    return results.slice(0, 30)
  }

  return {
    sessionID: () => params.id,
    hasSession: () => !!params.id && !!sessionInfo(),
    sessionInfo,
    messages,
    parts,
    sessionStatus,
    project,
    vcs,
    dirSync,
    executionData,
    specialistData,
    liveSpecialistData,
    repoData,
    appData,
    reasoningData,
    advancedData,
    timelineData,
    suggestionsData,
    followUpData,
    indexedStateData,
    filePreviewActions,
    favoriteFilesData,
    conversationSearch,
    fileRelatedFiles,
    fileImportedModules,
    bookmarkedMessages,
    addBookmark,
    removeBookmark,
    isBookmarked,
    notifications,
  }
}
