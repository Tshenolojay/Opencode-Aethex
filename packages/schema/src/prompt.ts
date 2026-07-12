import { Schema } from "effect"
import { optional } from "./schema"
import { statics } from "./schema"

export interface Source extends Schema.Schema.Type<typeof Source> {}
export const Source = Schema.Struct({
  start: Schema.Finite,
  end: Schema.Finite,
  text: Schema.String,
}).annotate({ identifier: "Prompt.Source" })

const FileAttachmentStruct = Schema.Struct({
  uri: Schema.String,
  mime: Schema.String,
  name: Schema.String.pipe(optional),
  description: Schema.String.pipe(optional),
  source: Source.pipe(optional),
}).annotate({ identifier: "Prompt.FileAttachment" })

export interface FileAttachment extends Schema.Schema.Type<typeof FileAttachmentStruct> {}

export const FileAttachment = FileAttachmentStruct.pipe(
  statics((schema) => ({
    create: (input: FileAttachment) =>
      schema.make({
        uri: input.uri,
        mime: input.mime,
        name: input.name,
        description: input.description,
        source: input.source,
      }),
  })),
)

export interface AgentAttachment extends Schema.Schema.Type<typeof AgentAttachment> {}
export const AgentAttachment = Schema.Struct({
  name: Schema.String,
  source: Source.pipe(optional),
}).annotate({ identifier: "Prompt.AgentAttachment" })

const PromptStruct = Schema.Struct({
  text: Schema.String,
  files: Schema.Array(FileAttachment).pipe(optional),
  agents: Schema.Array(AgentAttachment).pipe(optional),
}).annotate({ identifier: "Prompt" })

export interface Prompt extends Schema.Schema.Type<typeof PromptStruct> {}

export const Prompt = PromptStruct.pipe(
  statics((schema) => ({
    equivalence: Schema.toEquivalence(schema),
    fromUserMessage: (input: Pick<Prompt, "text" | "files" | "agents">) =>
      schema.make({
        text: input.text,
        ...(input.files === undefined ? {} : { files: input.files }),
        ...(input.agents === undefined ? {} : { agents: input.agents }),
      }),
  })),
)
