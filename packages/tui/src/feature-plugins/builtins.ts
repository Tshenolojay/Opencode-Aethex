import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import HomeFooter from "./home/footer"
import HomeTips from "./home/tips"
import SidebarContext from "./sidebar/context"
import SidebarFiles from "./sidebar/files"
import SidebarFooter from "./sidebar/footer"
import SidebarLsp from "./sidebar/lsp"
import SidebarMcp from "./sidebar/mcp"
import SidebarTodo from "./sidebar/todo"
import OrchestratorExecution from "./sidebar/orchestrator-execution"
import OrchestratorSpecialists from "./sidebar/orchestrator-specialists"
import OrchestratorModels from "./sidebar/orchestrator-models"
import OrchestratorKnowledge from "./sidebar/orchestrator-knowledge"
import OrchestratorPlanning from "./sidebar/orchestrator-planning"
import DiffViewer from "./system/diff-viewer"
import Notifications from "./system/notifications"
import PluginManager from "./system/plugins"
import WhichKey from "./system/which-key"

export type BuiltinTuiPlugin = Omit<TuiPluginModule, "id"> & {
  id: string
  tui: TuiPlugin
  enabled?: boolean
}

export function createBuiltinPlugins(options: { experimentalEventSystem: boolean }): BuiltinTuiPlugin[] {
  return [
    HomeFooter,
    HomeTips,
    SidebarContext,
    SidebarMcp,
    SidebarLsp,
    SidebarTodo,
    SidebarFiles,
    SidebarFooter,
    OrchestratorExecution,
    OrchestratorSpecialists,
    OrchestratorModels,
    OrchestratorKnowledge,
    OrchestratorPlanning,
    Notifications,
    PluginManager,
    WhichKey,
    DiffViewer,
  ]
}
