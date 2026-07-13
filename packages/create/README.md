# @unsigned-gg/create

PostHog-style install wizard for **cerebral/unsigned standard agent tooling**.

```bash
npx @unsigned-gg/create
```

Detects your project type (Rust / TypeScript / Python / monorepo) and installs the
shared agent-harness config that every cerebral-work and unsigned-gg repo uses:

- **`CLAUDE.md`** — project instructions for Claude Code (build, test, lint, conventions)
- **`.claude/settings.json`** — permissions, hooks config (worktree-safe)
- **`.claude/hooks/`** — enforced guardrails (main-push guard, ci-gate, lint-on-edit)
- **`lefthook.yml`** — git hooks mirroring CI (gitleaks, conventional commits, affected CI)
- **`.impeccable.md`** — design context placeholder (for impeccable plugin)
- `.config/overflow/` — overflow terminal emulator config (agent-aware, mux, shell integration)
- `.config/ghostty/` — ghostty terminal emulator config (unsigned color theme)
- `.agent-config/` — harness config presets: omp, pi, opencode, hermes (model gateway)
- `.agent-config/skills/` — symlink installer for agentskills.io shared across all harnesses
- `.agent-config/local-models/` — hardware probe script (GPU VRAM → model tier recommendation)

## Design

The wizard is interactive and idempotent: it never overwrites existing files
without confirmation, and re-runs pick up new files only.

**Detection** scans for `Cargo.toml`, `package.json`, `pyproject.toml`,
`.moon/workspace.yml`, `go.mod` to determine project type, then generates a
type-appropriate `CLAUDE.md` from the cerebral template family.

**Safety model** (mirrors terrarium CANON §4):
- File writes are **opt-in**: each file is shown before writing; existing files
  prompt for confirmation unless `--force`.
- No secrets are handled. No remote shells are piped.
- The wizard writes files only inside the target project directory.

## Usage

```bash
# Interactive (default)
npx @unsigned-gg/create

# Non-interactive (CI / scripting)
npx @unsigned-gg/create --yes --type rust --name my-crate

# Install only specific components
npx @unsigned-gg/create --only claude,hooks,lefthook

# Force overwrite existing files
npx @unsigned-gg/create --force
```

# Full agentic tooling (terminal + harness + skills + local models)
npx @unsigned-gg/create --only terminal,harness,skills,local-models

## Options

| Flag | Description |
|---|---|
| `--yes` / `-y` | Skip all prompts, use defaults / detected values |
| `--type <rust\|node\|python\|monorepo>` | Override project type detection |
| `--name <name>` | Project name (defaults to directory name) |
| `--only <a,b,c>` | Install only listed components: `claude,hooks,lefthook,impeccable,terminal,harness,skills,local-models` |
| `--force` | Overwrite existing files without prompting |
| `--dry-run` | Show what would be installed without writing |

## Components

### `claude` — CLAUDE.md + .claude/settings.json + .claude/README.md

The project instructions file Claude Code reads on every session. Generated
from the [todie/template-\*](https://github.com/todie) family with cerebral
conventions: signed conventional commits, no AI attribution, human merge gate.

### `hooks` — .claude/hooks/

Enforced guardrails (terrarium CANON §4):
- `guard-main-push.sh` — denies direct push to main (override: `# allow-direct-push`)
- `ci-gate.sh` — on `git push` → runs affected CI (bypass: `SKIP_CI_GATE=1`)
- `lint-on-edit.sh` — format-on-edit by file type (bypass: `SKIP_LINT=1`)

### `lefthook` — lefthook.yml

Git hooks mirroring CI: gitleaks on pre-commit, conventional commit-msg
enforcement, affected CI on pre-push.

### `impeccable` — .impeccable.md placeholder

Design context file for the impeccable plugin (accessibility, performance,
theming, responsive design audits). Placeholder with standard structure.

### `terminal` — overflow.toml + ghostty config

Agent-aware terminal emulator configs. **overflow** is the Rust GPU-accelerated
terminal (`unsigned-gg/overflow`) with mux, demon mode, attention router, and
reverie integration. **ghostty** is Mitchell Hashimoto's terminal. Both ship
with the "unsigned" color theme and OSC 133 shell integration.

### `harness` — omp/pi/opencode/hermes config presets

Model gateway config presets for all four agent harnesses, pointing at the
unsigned model gateway (`llm.unsigned.gg/v1`) and local endpoints
(ollama `:11434`, llama.cpp `:8080`, vLLM `:8000`). Copy-if-absent — never
clobbers live config. Requires `UNSIGNED_LLM_API_KEY` for gateway access.

### `skills` — agentskills.io symlink installer

Symlinks shared skills into every harness's skills directory (`~/.pi/agent/skills`,
`~/.config/opencode/skills`, `~/.hermes/skills`, `~/.omp/agent/skills`,
`~/.agents/skills`). Idempotent — re-runs only add new skills.

### `local-models` — hardware probe script

Detects GPU VRAM, CPU cores, and RAM → recommends a model tier (HIGH/MEDIUM/
ENTRY/LIGHT/CPU-ONLY) and serving backend. All harness presets are pre-wired
to the fixed serving ports.

## Terrarium federation

This package is part of the `agentic` monorepo (`unsigned-gg/agentic`), a
terrarium-federated node. Standards: moon workspace, proto-pinned toolchains,
conventional signed commits, release-please, affected-only CI + gitleaks.
