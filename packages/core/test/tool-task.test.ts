import { describe, expect } from "bun:test"
import { eq } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { AgentV2 } from "@opencode-ai/core/agent"
import { Database } from "@opencode-ai/core/database/database"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { EventV2 } from "@opencode-ai/core/event"
import { PermissionV2 } from "@opencode-ai/core/permission"
import { Project } from "@opencode-ai/core/project"
import { ProjectTable } from "@opencode-ai/core/project/sql"
import { AbsolutePath } from "@opencode-ai/core/schema"
import { SessionV2 } from "@opencode-ai/core/session"
import { getExecutionPackage } from "@opencode-ai/core/session/execution-package-store"
import { SessionProjector } from "@opencode-ai/core/session/projector"
import { SessionRunner } from "@opencode-ai/core/session/runner"
import { SessionInputTable, SessionTable } from "@opencode-ai/core/session/sql"
import { TaskTool } from "@opencode-ai/core/tool/task"
import { ToolRegistry } from "@opencode-ai/core/tool/registry"
import { ToolOutputStore } from "@opencode-ai/core/tool-output-store"
import { testEffect } from "./lib/effect"
import { settleTool, toolDefinitions, toolIdentity } from "./lib/tool"

const parentID = SessionV2.ID.make("ses_task_tool_parent")
const assertions: PermissionV2.AssertInput[] = []
const runs: SessionV2.ID[] = []

const permission = Layer.succeed(
  PermissionV2.Service,
  PermissionV2.Service.of({
    assert: (input) => Effect.sync(() => { assertions.push(input) }),
    ask: () => Effect.die("unused"),
    reply: () => Effect.die("unused"),
    get: () => Effect.die("unused"),
    forSession: () => Effect.die("unused"),
    list: () => Effect.die("unused"),
  }),
)

const runner = Layer.succeed(
  SessionRunner.Service,
  SessionRunner.Service.of({
    run: ({ sessionID }) => Effect.sync(() => { runs.push(sessionID) }),
  }),
)

const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([
      Database.node,
      EventV2.node,
      SessionProjector.node,
      AgentV2.node,
      ToolRegistry.node,
      ToolRegistry.toolsNode,
      TaskTool.node,
    ]),
    [
      [PermissionV2.node, permission],
      [SessionRunner.node, runner],
      [ToolOutputStore.node, ToolOutputStore.nodeWithoutConfig],
    ],
  ),
)

const setup = Effect.gen(function* () {
  assertions.length = 0
  runs.length = 0
  const { db } = yield* Database.Service
  const agents = yield* AgentV2.Service
  yield* agents.transform((draft) => {
    draft.update(AgentV2.ID.make("repository"), (agent) => {
      agent.description = "Repository specialist"
      agent.mode = "subagent"
      agent.hidden = false
      agent.permissions = []
    })
  })
  yield* db
    .insert(ProjectTable)
    .values({ id: Project.ID.global, worktree: AbsolutePath.make("/project"), sandboxes: [] })
    .run()
    .pipe(Effect.orDie)
  yield* db
    .insert(SessionTable)
    .values({
      id: parentID,
      project_id: Project.ID.global,
      slug: "parent",
      directory: "/project",
      title: "parent",
      version: "test",
      agent: "build",
    })
    .run()
    .pipe(Effect.orDie)
})

describe("TaskTool", () => {
  it.effect("creates and runs a real child specialist session", () =>
    Effect.gen(function* () {
      yield* setup
      const { db } = yield* Database.Service
      const registry = yield* ToolRegistry.Service

      expect((yield* toolDefinitions(registry)).map((tool) => tool.name)).toEqual([TaskTool.name])

      const settled = yield* settleTool(registry, {
        sessionID: parentID,
        ...toolIdentity,
        call: {
          type: "tool-call",
          id: "call-task",
          name: TaskTool.name,
          input: {
            description: "Inspect repository",
            prompt: "Inspect the repository structure and report hotspots.",
            subagent_type: "repository",
          },
        },
      })

      expect(runs).toHaveLength(1)
      const childID = runs[0]!
      const child = yield* db.select().from(SessionTable).where(eq(SessionTable.id, childID)).get().pipe(Effect.orDie)
      expect(child).toMatchObject({
        id: childID,
        parent_id: parentID,
        agent: "repository",
      })
      const admitted = yield* db
        .select()
        .from(SessionInputTable)
        .where(eq(SessionInputTable.session_id, childID))
        .get()
        .pipe(Effect.orDie)
      expect(admitted?.prompt).toMatchObject({
        text: "Inspect the repository structure and report hotspots.",
      })
      expect(assertions).toMatchObject([
        {
          sessionID: parentID,
          action: "task",
          resources: ["repository"],
          save: ["*"],
        },
      ])
      expect(settled).toMatchObject({
        output: {
          structured: {
            sessionID: childID,
            agent: "repository",
            status: "completed",
          },
        },
      })
      expect(getExecutionPackage(parentID)).toMatchObject({
        status: "specialists-complete",
        needsOrchestration: false,
        specialists: [{ name: "repository", status: "executed" }],
      })
    }),
  )
})
