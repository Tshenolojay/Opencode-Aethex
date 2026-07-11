import { createMemo } from "solid-js"
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
        const parts = msg.path.root.split("/").filter(Boolean)
        if (parts[0]) srcDirs.add(parts[0])
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

  return {
    sessionID: () => params.id,
    sessionInfo,
    messages,
    parts,
    sessionStatus,
    project,
    vcs,
    dirSync,
    executionData,
    specialistData,
    repoData,
    appData,
    reasoningData,
    advancedData,
  }
}
