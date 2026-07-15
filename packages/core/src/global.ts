import path from "path"
import { existsSync } from "fs"
import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import os from "os"
import { Context, Effect, Layer } from "effect"
import { Flock } from "./util/flock"
import { Flag } from "./flag/flag"
import { makeGlobalNode } from "./effect/app-node"

const app = "opencode-nexus"
const data = path.join(xdgData!, app)
const cache = path.join(xdgCache!, app)
const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)
const tmp = path.join(os.tmpdir(), app)

const paths = {
  get home() {
    return process.env.OPENCODE_NEXUS_HOME ?? process.env.OPENCODE_TEST_HOME ?? os.homedir()
  },
  data,
  bin: path.join(cache, "bin"),
  log: path.join(data, "log"),
  repos: path.join(data, "repos"),
  cache,
  config,
  state,
  tmp,
}

export const Path = paths

Flock.setGlobal({ state })

// Phase 11 — first-launch migration from legacy config dirs into the new
// `opencode-nexus` locations.  Copies non-destructively (never overwrites
// existing files) and only runs once (the target dir won't exist yet).
const legacyConfigDirs = [
  path.join(os.homedir(), ".opencode"),
  path.join(xdgConfig!, "opencode"),
]

async function copyDirNonOverwriting(src: string, dst: string): Promise<void> {
  let entries: import("fs").Dirent[]
  try {
    entries = await fs.readdir(src, { withFileTypes: true })
  } catch {
    return
  }
  await fs.mkdir(dst, { recursive: true })
  for (const entry of entries) {
    if (entry.name === "bin" || entry.name === "repos") continue
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      await copyDirNonOverwriting(srcPath, dstPath)
    } else if (!existsSync(dstPath)) {
      await fs.copyFile(srcPath, dstPath)
    }
  }
}

async function migrateLegacyConfig() {
  if (existsSync(Path.config)) return
  for (const legacy of legacyConfigDirs) {
    if (existsSync(legacy)) {
      await copyDirNonOverwriting(legacy, Path.config)
      break
    }
  }
}

await Promise.all([
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.tmp, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
  fs.mkdir(Path.repos, { recursive: true }),
  migrateLegacyConfig(),
])

export class Service extends Context.Service<Service, Interface>()("@opencode/Global") {}

export interface Interface {
  readonly home: string
  readonly data: string
  readonly cache: string
  readonly config: string
  readonly state: string
  readonly tmp: string
  readonly bin: string
  readonly log: string
  readonly repos: string
}

export function make(input: Partial<Interface> = {}): Interface {
  return {
    home: Path.home,
    data: Path.data,
    cache: Path.cache,
    config: Flag.OPENCODE_CONFIG_DIR ?? Path.config,
    state: Path.state,
    tmp: Path.tmp,
    bin: Path.bin,
    log: Path.log,
    repos: Path.repos,
    ...input,
  }
}

const layer = Layer.effect(
  Service,
  Effect.sync(() => Service.of(make())),
)

export const node = makeGlobalNode({ service: Service, layer: layer, deps: [] })

export const layerWith = (input: Partial<Interface>) =>
  Layer.effect(
    Service,
    Effect.sync(() => Service.of(make(input))),
  )

export * as Global from "./global"
