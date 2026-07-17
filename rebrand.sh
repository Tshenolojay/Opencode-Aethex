#!/usr/bin/env bash
# rebrand.sh — Re-apply OpenCode Aethex branding after merging upstream OpenCode
#
# Philosophy:
#   - Dependencies (package.json, bun.lock) can be synced from upstream
#   - Database schemas (*.sql.ts) MUST stay identical to upstream — never modify
#   - All other code is fork-owned: builds, npm, releases, branding
#
# Usage:
#   ./rebrand.sh          # apply all branding
#   ./rebrand.sh --dry-run # preview changes without writing
#
# Run this after: git merge upstream/dev
# The post-merge hook runs this automatically.

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

UPSTREAM_REPO="anomalyco/opencode"
FORK_REPO="Tshenolojay/Opencode-Aethex"
GITHUB_USER="Tshenolojay"
AUTHOR_NAME="Tshenolo Jautse"

log() { printf "\033[1;36m→ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$1"; }

# sed helper — runs sed on matching files, excluding node_modules/.git/dist
# Usage: run_sed 's/pattern/replacement/g' [extra_find_excludes...]
run_sed() {
  local pattern="$1"
  shift
  local extra_excludes=("$@")

  if $DRY_RUN; then
    grep -rli "$pattern" --include='*.ts' --include='*.tsx' --include='*.js' \
      --include='*.json' --include='*.md' --include='*.yml' --include='*.yaml' \
      --include='*.sh' --include='*.nix' --include='*.toml' --include='*.txt' \
      --include='*.mjs' . 2>/dev/null \
      | grep -v node_modules | grep -v '.git/' | grep -v 'dist/' \
      | grep -v 'bun.lock' | grep -v 'rebrand.sh' \
      | grep -v '.sql.ts' \
      | while read -r f; do
          echo "  [dry-run] $f"
        done
  else
    find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
      -o -name '*.json' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' \
      -o -name '*.sh' -o -name '*.nix' -o -name '*.toml' -o -name '*.txt' \
      -o -name '*.mjs' -o -name '*.cjs' \) \
      -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
      -not -name 'bun.lock' -not -name 'rebrand.sh' \
      -not -name '*.sql.ts' \
      ${extra_excludes[@]+"${extra_excludes[@]}"} \
      -exec sed -i "$pattern" {} +
  fi
}

# Targeted sed — run sed on specific files only
run_sed_on() {
  local pattern="$1"
  shift
  if $DRY_RUN; then
    for f in "$@"; do
      [ -f "$f" ] && grep -q "$pattern" "$f" 2>/dev/null && echo "  [dry-run] $f"
    done
  else
    for f in "$@"; do
      [ -f "$f" ] && sed -i "$pattern" "$f"
    done
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1: Package names in package.json files
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 1: Package names"

run_sed 's/"name": "opencode"/"name": "opencode-aethex"/g' \
  --exclude='bin/opencode' --exclude='postinstall.mjs'

run_sed 's/"opencode": "\.\/bin\/opencode"/"opencode-aethex": ".\/bin\/opencode"/g'

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2: CLI identity (scriptName, version check, description)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 2: CLI identity"

CLI_FILES=(
  "packages/opencode/src/index.ts"
  "packages/opencode/src/temporary.ts"
  "packages/opencode/src/cli/cmd/run/splash.ts"
  "packages/tui/src/util/presentation.ts"
  "packages/opencode/src/installation/index.ts"
)

run_sed_on 's/\.scriptName("opencode")/.scriptName("opencode-aethex")/g' "${CLI_FILES[@]}"
run_sed_on 's/if (!text\.startsWith("opencode "))/if (!text.startsWith("opencode-aethex "))/g' "${CLI_FILES[@]}"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3: App directory & install paths (global.ts, install script)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 3: App directory & install paths"

run_sed 's/const app = "opencode"/const app = "opencode-aethex"/g'
run_sed 's|INSTALL_DIR=\$HOME/\.opencode/bin|INSTALL_DIR=$HOME/.opencode-aethex/bin|g'
run_sed 's/\.opencode\/bin/.opencode-aethex\/bin/g'

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 4: Installation method checks (brew, scoop, choco, npm)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 4: Installation methods"

INSTALL_FILE="packages/opencode/src/installation/index.ts"
run_sed_on 's/brew", "list", "--formula", "opencode"/brew", "list", "--formula", "opencode-aethex"/g' "$INSTALL_FILE"
run_sed_on 's/scoop", "list", "opencode"/scoop", "list", "opencode-aethex"/g' "$INSTALL_FILE"
run_sed_on 's/choco", "list", "--limit-output", "opencode"/choco", "list", "--limit-output", "opencode-aethex"/g' "$INSTALL_FILE"
run_sed_on 's/npm", "install", "-g", `opencode@/npm", "install", "-g", `opencode-aethex@/g' "$INSTALL_FILE"
run_sed_on 's/pnpm", "install", "-g", `opencode@/pnpm", "install", "-g", `opencode-aethex@/g' "$INSTALL_FILE"
run_sed_on 's/bun", "install", "-g", `opencode@/bun", "install", "-g", `opencode-aethex@/g' "$INSTALL_FILE"
run_sed_on 's/choco", "upgrade", "opencode"/choco", "upgrade", "opencode-aethex"/g' "$INSTALL_FILE"
run_sed_on 's/scoop", "install", `opencode@/scoop", "install", `opencode-aethex@/g' "$INSTALL_FILE"
run_sed_on 's|opencode/|opencode-aethex/|g' "$INSTALL_FILE"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 5: Build script — binary output names
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 5: Build script binary output"

BUILD_FILE="packages/opencode/script/build.ts"
run_sed_on 's|dist/\${name}/bin/opencode$|dist/${name}/bin/opencode-aethex|g' "$BUILD_FILE"
run_sed_on 's|const binaryPath = `dist/\${name}/bin/opencode`|const binaryPath = `dist/${name}/bin/opencode-aethex`|g' "$BUILD_FILE"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 6: CI/CD — publish.yml artifact names
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 6: CI/CD artifact names"

WORKFLOW=".github/workflows/publish.yml"
run_sed_on 's/opencode-cli/opencode-aethex-cli/g' "$WORKFLOW"
run_sed_on 's/opencode-desktop/opencode-aethex-desktop/g' "$WORKFLOW"
run_sed_on 's/opencode-preview-cli/opencode-aethex-preview-cli/g' "$WORKFLOW"
run_sed_on 's/bun i -g opencode$/bun i -g opencode-aethex/g' "$WORKFLOW"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 7: Nix pname and binary
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 7: Nix"

NIX_FILE="nix/opencode.nix"
run_sed_on 's/pname = "opencode"/pname = "opencode-aethex"/g' "$NIX_FILE"
run_sed_on 's|mainProgram = "opencode"|mainProgram = "opencode-aethex"|g' "$NIX_FILE"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 8: Display name (OpenCode → OpenCode Aethex)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 8: Display name"

run_sed 's/"OpenCode"/"OpenCode Aethex"/g'
run_sed 's/>OpenCode</>OpenCode Aethex</g'
run_sed 's/title: "OpenCode"/title: "OpenCode Aethex"/g'
run_sed 's/productName: "OpenCode"/productName: "OpenCode Aethex"/g'
run_sed 's/\.setTerminalTitle("OpenCode")/.setTerminalTitle("OpenCode Aethex")/g'
run_sed 's/name: "OpenCode"/name: "OpenCode Aethex"/g'
run_sed 's/aria-label="OpenCode/aria-label="OpenCode Aethex/g'
run_sed 's/content="OpenCode"/content="OpenCode Aethex"/g'
run_sed 's/"nav\.logoAlt": "OpenCode"/"nav.logoAlt": "OpenCode Aethex"/g'
run_sed 's/label: "OpenCode"/label: "OpenCode Aethex"/g'
run_sed 's/prompts\.intro("Uninstall OpenCode")/prompts.intro("Uninstall OpenCode Aethex")/g'
run_sed 's/log\.success("Thank you for using OpenCode!")/log.success("Thank you for using OpenCode Aethex!")/g'

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 9: Environment variables (OPENCODE_ → OPENCODE_AETHEX_)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 9: Environment variables"

FLAG_FILE="packages/core/src/flag/flag.ts"
GLOBAL_FILE="packages/core/src/global.ts"

run_sed_on 's/process\.env\.OPENCODE_HOME/process.env.OPENCODE_AETHEX_HOME/g' "$GLOBAL_FILE"
run_sed_on 's/process\.env\[\"OPENCODE_/process.env["OPENCODE_AETHEX_/g' "$FLAG_FILE"
run_sed_on 's/OPENCODE_\${suffix}/OPENCODE_AETHEX_${suffix}/g' "$FLAG_FILE"
run_sed_on 's/OPENCODE_PID/OPENCODE_AETHEX_PID/g' "packages/opencode/src/index.ts"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 10: GitHub repo references
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 10: GitHub repo references"

run_sed "s|anomalyco/opencode|$FORK_REPO|g"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 11: Homebrew tap references
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 11: Homebrew tap"

run_sed_on 's|opencode/tap/opencode|opencode/tap/opencode-aethex|g' "$INSTALL_FILE"

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 12: Fork credits & author
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 12: Fork credits & author"

add_fork_credit() {
  local file="$1"
  local marker="Forked from anomalyco/opencode"
  if ! grep -q "$marker" "$file" 2>/dev/null; then
    if $DRY_RUN; then
      echo "  [dry-run] Would add fork credit to $file"
    else
      sed -i "1i\\
// Forked from $UPSTREAM_REPO — https://github.com/$FORK_REPO" "$file"
    fi
  fi
}

add_fork_credit "packages/opencode/src/cli/ui.ts"

run_sed 's/"author": "Anomaly"/"author": "'"$AUTHOR_NAME"'"/g'

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 13: Feedback URLs (idempotent — only adds if missing)
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 13: Feedback URLs"

INDEX_FILE="packages/opencode/src/index.ts"
if ! grep -q "Opencode-Aethex/issues" "$INDEX_FILE" 2>/dev/null; then
  if $DRY_RUN; then
    echo "  [dry-run] Would add epilog to $INDEX_FILE"
  else
    sed -i '/\.usage("")/a\  .epilog("Feedback & Issues: https://github.com/'"$FORK_REPO"'/issues")' "$INDEX_FILE"
  fi
fi

if ! grep -q "Feedback & Issues" README.md 2>/dev/null; then
  if $DRY_RUN; then
    echo "  [dry-run] Would add feedback section to README.md"
  else
    cat >> README.md << 'FEEDBACK_EOF'

## Feedback & Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/Tshenolojay/Opencode-Aethex/issues) on GitHub. Your feedback helps us improve OpenCode Aethex.
FEEDBACK_EOF
  fi
fi

if ! grep -q "Opencode-Aethex/issues" install 2>/dev/null; then
  if $DRY_RUN; then
    echo "  [dry-run] Would add feedback line to install"
  else
    sed -i '/For more information visit/a\echo -e "${MUTED}Report issues: ${NC}https://github.com/'"$FORK_REPO"'/issues"' install
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Phase 14: Verification
# ═══════════════════════════════════════════════════════════════════════════════
log "Phase 14: Verification"

if ! $DRY_RUN; then
  echo ""

  # Check package.json names
  REMAINING=$(grep -rn '"name": "opencode"' --include='package.json' . 2>/dev/null | grep -v node_modules | grep -v bun.lock || true)
  if [ -n "$REMAINING" ]; then
    warn "Found un-rebranded package.json names:"
    echo "$REMAINING"
  else
    echo "  ✓ All package.json names rebranded"
  fi

  # Check env vars (allow OPENCODE_TEST, OPENCODE_BIN_PATH, and .d.ts files)
  REMAINING_ENV=$(grep -rn 'OPENCODE_[A-Z]' --include='*.ts' --include='*.js' . 2>/dev/null \
    | grep -v node_modules | grep -v 'OPENCODE_AETHEX' | grep -v 'OPENCODE_TEST' \
    | grep -v 'OPENCODE_BIN_PATH' | grep -v '.d.ts' || true)
  if [ -n "$REMAINING_ENV" ]; then
    warn "Found un-rebranded env vars:"
    echo "$REMAINING_ENV"
  else
    echo "  ✓ All env vars rebranded"
  fi

  # Check upstream repo references
  REMAINING_UPSTREAM=$(grep -rn 'anomalyco' --include='*.ts' --include='*.tsx' --include='*.json' --include='*.md' --include='*.yml' --include='*.sh' . 2>/dev/null \
    | grep -v node_modules | grep -v bun.lock | grep -v '.sql.ts' || true)
  if [ -n "$REMAINING_UPSTREAM" ]; then
    warn "Found remaining upstream references:"
    echo "$REMAINING_UPSTREAM"
  else
    echo "  ✓ All upstream references replaced"
  fi

  # Verify database schemas are UNCHANGED from upstream
  echo ""
  echo "  Database schema check (should match upstream):"
  for sql_file in $(find packages/core/src -name '*.sql.ts' 2>/dev/null); do
    if git diff origin/dev -- "$sql_file" 2>/dev/null | grep -q '.'; then
      warn "  $sql_file has local changes (should match upstream)"
    else
      echo "  ✓ $sql_file matches upstream"
    fi
  done

  echo ""
  log "Rebrand complete! Review with: git diff"
  log "Then commit: git add . && git commit -m 'chore: rebrand after upstream merge'"
else
  echo ""
  log "Dry run complete. No files were modified."
  log "Run without --dry-run to apply changes."
fi
