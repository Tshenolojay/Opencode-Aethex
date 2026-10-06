export * as TaskTool from "./task"

import { ToolFailure } from "@opencode-ai/llm"
import { Effect, Layer, Schema } from "effect"
import { AgentV2 } from "../agent"
import { Database } from "../database/database"
import { EventV2 } from "../event"
import { InstallationVersion } from "../installation/version"
import { PermissionV2 } from "../permission"
import { SessionExecution } from "../session/execution"
import { SessionInput } from "../session/input"
import { SessionMessage } from "../session/message"
import { Prompt } from "../session/prompt"
import { SessionSchema } from "../session/schema"
import { SessionStore } from "../session/store"
import { SessionV1 } from "../v1/session"
import { Slug } from "../util/slug"
import { makeLocationNode } from "../effect/app-node"
import { ToolRegistry } from "./registry"
import { Tool } from "./tool"
import { Tools } from "./tools"

export const name = "task"

export const Input = Schema.Struct({
  description: Schema.String.annotate({ description: "Short description of the specialist task" }),
  prompt: Schema.String.annotate({ description: "Detailed task for the specialist agent" }),
  subagent_type: Schema.String.annotate({ description: "Registered subagent ID to execute" }),
  task_id: Schema.String.pipe(Schema.optional).annotate({
    description: "Existing child session ID to continue instead of creating a new child",
  }),
})

export const Output = Schema.Struct({
  sessionID: Schema.String,
  agent: Schema.String,
  status: Schema.Literals(["completed", "error"]),
  text: Schema.String,
})
export type Output = typeof Output.Type

function assistantText(messages: readonly SessionMessage.Message[]): string {
  const assistant = messages.findLast((message) => message.type === "assistant")
  if (!assistant) return ""
  return assistant.content
    .flatMap((part) => (part.type === "text" && part.text.trim().length > 0 ? [part.text] : []))
    .join("\n")
    .trim()
}

const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const tools = yield* Tools.Service
    const { db } = yield* Database.Service
    const agents = yield* AgentV2.Service
    const permission = yield* PermissionV2.Service
    const sessions = yield* SessionStore.Service
    const execution = yield* SessionExecution.Service
    const events = yield* EventV2.Service

    yield* tools
      .register({
        [name]: Tool.make({
          description:
            "Launch a registered OpenCode subagent in a real child session, wait for it to finish, and return its final response. Use the exact subagent ID advertised by the orchestration plan.",
          input: Input,
          output: Output,
          toModelOutput: ({ output }) => [
            {
              type: "text",
              text: [
                `Subagent ${output.agent} ${output.status} in ${output.sessionID}.`,
                output.text,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
          execute: (input, context) =>
            Effect.gen(function* () {
              const source = {
                type: "tool" as const,
                messageID: context.assistantMessageID,
                callID: context.toolCallID,
              }

              const requestedAgent = AgentV2.ID.make(input.subagent_type)
              const specialist = yield* agents.get(requestedAgent)
              if (!specialist || specialist.hidden || specialist.mode === "primary") {
                return yield* Effect.fail(
                  new ToolFailure({ message: `Unknown or non-subagent agent: ${input.subagent_type}` }),
                )
              }

              yield* permission.assert({
                action: name,
                resources: [input.subagent_type],
                save: ["*"],
                sessionID: context.sessionID,
                agent: context.agent,
                source,
              })

              const parent = yield* sessions.get(context.sessionID)
              if (!parent) {
                return yield* Effect.fail(new ToolFailure({ message: `Parent session not found: ${context.sessionID}` }))
              }

              const requestedTaskID = input.task_id ? SessionSchema.ID.make(input.task_id) : undefined
              const existing = requestedTaskID ? yield* sessions.get(requestedTaskID) : undefined
              if (requestedTaskID && !existing) {
                return yield* Effect.fail(new ToolFailure({ message: `Task session not found: ${input.task_id}` }))
              }
              if (existing && existing.parentID !== context.sessionID) {
                return yield* Effect.fail(
                  new ToolFailure({ message: "Task session does not belong to the current parent session" }),
                )
              }

              const child =
                existing ??
                (yield* Effect.gen(function* () {
                  const childID = SessionSchema.ID.create()
                  const now = Date.now()
                  const model = specialist.model ?? parent.model
                  const info = SessionV1.SessionInfo.make({
                    id: childID,
                    slug: Slug.create(),
                    version: InstallationVersion,
                    projectID: parent.projectID,
                    directory: parent.location.directory,
                    path: parent.subpath ?? "",
                    workspaceID: parent.location.workspaceID,
                    parentID: context.sessionID,
                    title: `${input.description} (@${specialist.id} subagent)`,
                    agent: specialist.id,
                    model,
                    cost: 0,
                    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
                    time: { created: now, updated: now },
                  })
                  yield* events.publish(
                    SessionV1.Event.Created,
                    { sessionID: childID, info },
                    { location: parent.location },
                  )
                  const created = yield* sessions.get(childID)
                  if (!created) {
                    return yield* Effect.fail(new ToolFailure({ message: "Child session was not projected" }))
                  }
                  return created
                }))

              const messageID = SessionMessage.ID.create()
              const prompt = Prompt.fromUserMessage({ text: input.prompt })
              yield* SessionInput.admit(db, events, {
                id: messageID,
                sessionID: child.id,
                prompt,
                delivery: "steer",
              })
              return { child, messageID }
            }).pipe(
              Effect.flatMap(({ child }) =>
                execution.resume(child.id).pipe(
                  Effect.andThen(sessions.context(child.id)),
                  Effect.map((messages) => {
                    const text = assistantText(messages)
                    return {
                      sessionID: child.id,
                      agent: child.agent ?? input.subagent_type,
                      status: "completed" as const,
                      text: text || "Subagent completed without a text response.",
                    }
                  }),
                ),
              ),
              Effect.mapError((error) =>
                error instanceof ToolFailure
                  ? error
                  : new ToolFailure({ message: `Subagent execution failed: ${String(error)}` }),
              ),
            ),
        }),
      })
      .pipe(Effect.orDie)
  }),
)

export const node = makeLocationNode({
  name: "tool/task",
  layer,
  deps: [
    ToolRegistry.node,
    AgentV2.node,
    PermissionV2.node,
    SessionStore.node,
    SessionExecution.node,
    EventV2.node,
    Database.node,
  ],
})
