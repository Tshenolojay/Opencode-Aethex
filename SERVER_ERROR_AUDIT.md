# OpenCode-Nexus Server Startup Failure — Error Audit Report

**Generated:** 2026-07-16
**Purpose:** Share with an external assistant (ChatGPT) to help fix the `opencode serve` backend not starting.
**Repo:** `/home/maestrojay/AI-Labs/OpenCode-Orchestrator` (monorepo, bun workspaces)
**Toolchain:** bun 1.3.14, Node 18.x, Linux

---

## 1. Symptom (user-visible)

Running the documented backend command:

```
cd packages/opencode && bun run --conditions=browser ./src/index.ts serve --port 4096
```

Produces one of two failure modes:

- **Mode A (user's terminal):** prints warning then dies fast
  ```
  Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.
  Error: Unexpected error

  ServeError
  ```
- **Mode B (reproduced here):** process stays alive but produces **zero** stdout/stderr and never binds the port (TCP connect times out, `ss` shows no listener). Equivalent to a silent hang at startup.

Web UI (`packages/app`, `bun dev -- --port 4444`) then cannot connect to `localhost:4096`, so it shows a blank/white layout (the `ConnectionGate` never gets a healthy server).

---

## 2. Root cause (high confidence)

**The bun workspace install is incomplete.** Almost all `@opencode-ai/*` workspace packages are NOT symlinked into `node_modules/@opencode-ai/`.

Evidence:
```
$ ls node_modules/@opencode-ai/
plugin  script  sdk          <-- only 3 of ~33 workspace packages linked

$ ls -d packages/*/ | wc -l
33                         <-- 33 workspace packages exist

$ ls node_modules/@opencode-ai/ | wc -l
3                          <-- only 3 are linked
```

The missing ones include the critical runtime deps:
`@opencode-ai/core`, `@opencode-ai/orchestrator`, `@opencode-ai/ui`,
`@opencode-ai/app`, `@opencode-ai/tui`, `@opencode-ai/schema`,
`@opencode-ai/protocol`, `@opencode-ai/sdk-next`, `@opencode-ai/session-ui`.

The backend entrypoint (`packages/opencode/src/index.ts`) statically imports
`SessionIntegration` / `OrchestratorService` from `@opencode-ai/orchestrator`
(see `packages/opencode/src/session.ts`). When the module graph loads, the
import of `@opencode-ai/orchestrator` (and transitively `@opencode-ai/core`)
cannot resolve, so the server either throws or hangs before binding the port.

`bun pm ls` confirms bun *knows* the workspaces exist
(`@opencode-ai/core@workspace:packages/core`, etc.) — they are just never
symlinked into `node_modules`.

---

## 3. Why `bun install` does not fix it

`bun install` hangs at the very first resolver step and never reaches the
symlink stage:

```
$ bun install
bun install v1.3.14 (0d9b296a)
Resolving dependencies
   <-- hangs here until timeout (killed at 180s)
```

Tried variants, all hang at "Resolving dependencies":
- `bun install` (network)
- `bun install --frozen-lockfile`
- `bun install --offline --frozen-lockfile`

The lockfile is large: `bun.lock` = 861,860 bytes, ~3,186 resolved deps.
The hang is in bun's resolver reading/parsing this lockfile (not network —
offline also hangs). No error is ever printed.

`bun.lock` is tracked in git and shows **no local modifications**
(`git status --short bun.lock` is empty), so it is not a locally-corrupted
working copy — the resolver itself stalls on this lockfile under bun 1.3.14.

---

## 4. Reproduction steps (exact)

```bash
cd /home/maestrojay/AI-Labs/OpenCode-Orchestrator
# 1) confirm missing symlinks
ls node_modules/@opencode-ai/            # expect only plugin/script/sdk

# 2) try to start backend
cd packages/opencode
bun run --conditions=browser ./src/index.ts serve --port 4096
# -> either "Error: Unexpected error / ServeError" or silent hang, no port bound

# 3) confirm the import itself hangs
bun -e "import('@opencode-ai/orchestrator').then(()=>console.log('ok')).catch(e=>console.error(e))"
# -> times out (exit 124), no output
```

---

## 5. Notes on the `"ServeError"` token

- `ServeError` is **not defined anywhere** in the repo (`grep -rn ServeError packages/`
  returns nothing) and **not** in `node_modules` (grep across `node_modules/@effect`
  and `node_modules/effect` found nothing).
- It is surfaced only because `packages/opencode/src/index.ts:128-134` does:
  ```ts
  catch (e) {
    const formatted = FormatError(e)
    if (formatted === undefined) {
      UI.error("Unexpected error" + EOL)          // -> "Error: Unexpected error"
      process.stderr.write(errorMessage(e) + EOL)  // -> "ServeError"
    }
  }
  ```
  `FormatError` returns `undefined` for unknown tags, and `errorMessage(e)`
  prints the error's `_tag`/`String(e)` — which in this case renders as
  `ServeError`. So `ServeError` is a downstream symptom of the failed/hung
  import, **not** the underlying cause. The underlying cause is the missing
  `@opencode-ai/*` workspace symlinks (Section 2).

---

## 6. What was already verified NOT to be the cause

- The `OPENCODE_SERVER_PASSWORD` warning is benign (server is just unsecured).
- The earlier `MaxListenersExceeded` warning on `GlobalBusEmitter` was fixed
  (`packages/opencode/src/bus/global.ts` now calls `GlobalBus.setMaxListeners(64)`).
- The dark-theme defaults were already changed (`packages/ui/src/theme/context.tsx`
  and `packages/app/public/oc-theme-preload.js` now default `colorScheme` to
  `"dark"`) — unrelated to startup.
- The orchestrator `Layer.mergeAll` restructuring and `Catalog.layer` additions
  compile at the import-analysis level; the failure happens *before* any layer
  is built, during bare module resolution of the missing workspace packages.

---

## 7. Recommended fix path (for the assistant to validate)

1. **Get a working install.** The blocker is `bun install` hanging on the
   lockfile. Options to try, in order:
   - Upgrade bun (`bun upgrade`) — 1.3.14 may have a resolver regression on
     large lockfiles; a newer 1.3.x / 1.4.x may resolve cleanly.
   - Delete `bun.lock` + `node_modules` and reinstall from scratch (forces a
     fresh resolve; may be slow but avoids the stalled parse).
   - If a specific transitive dependency is the stall point, bisect the
     lockfile or pin/remove that dep.
2. **Verify symlinks appear** after install:
   ```
   ls node_modules/@opencode-ai/ | wc -l    # should be ~33, not 3
   ls -la node_modules/@opencode-ai/core     # should be a symlink to packages/core
   ```
3. **Start backend:**
   ```
   cd packages/opencode && bun run --conditions=browser ./src/index.ts serve --port 4096
   ```
4. **Start web UI (separate terminal):**
   ```
   cd packages/app && bun dev -- --port 4444
   ```
5. Open `http://localhost:4444` (targets backend at `http://localhost:4096`).

---

## 8. Environment facts

| Item | Value |
|------|-------|
| bun | 1.3.14 (0d9b296a) |
| Node | v18.20.8 |
| OS | Linux (x86_64) |
| Monorepo | bun workspaces, 33 `packages/*` |
| `bun.lock` | 861,860 bytes, ~3,186 deps, git-clean |
| Linked `@opencode-ai/*` | 3 of 33 (plugin, script, sdk only) |
| Backend entry | `packages/opencode/src/index.ts` (`serve` command) |
| Failing import | `@opencode-ai/orchestrator` -> `@opencode-ai/core` |
