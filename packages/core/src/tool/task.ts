export * as TaskTool from "./task"

import { ToolFailure } from "@opencode-ai/llm"
import { Effect, Layer, Schema } from "effect"
import { AgentV2 } from "../agent"
import { Database } from "../database/database"
import { EventV2 } from "../event"
import { ExecutionPackage as ExecutionPackageContract } from "@opencode-ai/schema/execution-package"
import { InstallationVersion } from "../installation/version"
import { PermissionV2 } from "../permission"
import { SessionRunner } from "../session/runner"
import * as SessionRunnerLLM from "../session/runner/llm"
import { SessionInput } from "../session/input"
import { SessionMessage } from "../session/message"
import { Prompt } from "../session/prompt"
import { SessionSchema } from "../session/schema"
import { SessionStore } from "../session/store"
import { getExecutionPackage, setExecutionPackage } from "../session/execution-package-store"
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
    const runner = yield* SessionRunner.Service
    const events = yield* EventV2.Service

    const updateSpecialistStatus = Effect.fn("TaskTool.updateSpecialistStatus")(function* (input: {
      parentSessionID: SessionSchema.ID
      specialist: string
      role?: string
      status: string
      childSessionID?: SessionSchema.ID
      note?: string
      resultText?: string
    }) {
      const current = getExecutionPackage(input.parentSessionID)
      const existing = current?.specialists ?? []
      const found = existing.some((item) => item.name === input.specialist)
      const specialists = found
        ? existing.map((item) =>
            item.name === input.specialist
              ? { ...item, role: item.role ?? input.role, status: input.status }
              : item,
          )
        : [...existing, { name: input.specialist, role: input.role, status: input.status }]
      const activity = [
        ...(current?.activity ?? []),
        input.note ??
          `Specialist ${input.specialist}: ${input.status}${input.childSessionID ? ` (${input.childSessionID})` : ""}`,
      ].slice(-12)
      const remaining = specialists.filter(
        (item) => item.status !== "executed" && item.status !== "completed" && item.status !== "bypassed",
      )
      const nextStatus =
        input.status === "running"
          ? "orchestrating"
          : input.status === "failed"
            ? "failed"
            : remaining.length === 0
              ? "specialists-complete"
              : "planned"
      const knowledgeUpdate =
        input.status === "executed" && input.resultText?.trim()
          ? input.specialist === "repository"
            ? { repositoryIntelligence: input.resultText.trim() }
            : input.specialist === "architecture"
              ? { architectureSummary: input.resultText.trim() }
              : input.specialist === "dependency"
                ? { dependencySummary: input.resultText.trim() }
                : input.specialist === "documentation"
                  ? { documentationSummary: input.resultText.trim() }
                  : input.specialist === "verification"
                    ? { verificationSummary: input.resultText.trim() }
                    : {}
          : {}
      const next = {
        ...(current ?? {
          sessionID: input.parentSessionID,
          timestamp: Date.now(),
        }),
        timestamp: Date.now(),
        status: nextStatus,
        specialists,
        needsOrchestration: remaining.length > 0,
        activity,
        ...knowledgeUpdate,
      } satisfies typeof ExecutionPackageContract.Info.Type
      setExecutionPackage(input.parentSessionID, next)
      yield* Effect.all([
        events.publish(ExecutionPackageContract.Updated, {
          sessionID: input.parentSessionID,
          package: next,
        }),
        events.publish(ExecutionPackageContract.SpecialistPlanUpdated, {
          sessionID: input.parentSessionID,
          specialists,
          consensusSummary: next.consensusSummary,
        }),
      ])
    })

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
                  const childID = SessionSchema.ID.create() as SessionSchema.ID
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

              yield* updateSpecialistStatus({
                parentSessionID: context.sessionID,
                specialist: input.subagent_type,
                role: specialist.description,
                status: "running",
                childSessionID: child.id,
                note: `Started ${input.subagent_type} specialist in child session ${child.id}`,
              })

              const messageID = SessionMessage.ID.create() as SessionMessage.ID
              const prompt = Prompt.fromUserMessage({ text: input.prompt }) as Prompt
              yield* SessionInput.admit(db, events, {
                id: messageID,
                sessionID: child.id,
                prompt,
                delivery: "steer",
              })
              return { child, messageID, specialist }
            }).pipe(
              Effect.flatMap(({ child, specialist }) =>
                runner.run({ sessionID: child.id, force: true }).pipe(
                  Effect.andThen(sessions.context(child.id)),
                  Effect.flatMap((messages) => {
                    const text = assistantText(messages)
                    return updateSpecialistStatus({
                      parentSessionID: context.sessionID,
                      specialist: input.subagent_type,
                      role: specialist.description,
                      status: "executed",
                      childSessionID: child.id,
                      note: `Completed ${input.subagent_type} specialist in child session ${child.id}`,
                      resultText: text,
                    }).pipe(
                      Effect.as({
                        sessionID: child.id,
                        agent: child.agent ?? input.subagent_type,
                        status: "completed" as const,
                        text: text || "Subagent completed without a text response.",
                      }),
                    )
                  }),
                  Effect.tapError(() =>
                    updateSpecialistStatus({
                      parentSessionID: context.sessionID,
                      specialist: input.subagent_type,
                      role: specialist.description,
                      status: "failed",
                      childSessionID: child.id,
                      note: `Failed ${input.subagent_type} specialist in child session ${child.id}`,
                    }).pipe(Effect.ignore),
                  ),
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
    SessionRunnerLLM.node,
    EventV2.node,
    Database.node,
  ],
})
