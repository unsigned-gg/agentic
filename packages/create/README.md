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
- **`.claude/README.md`** — hook map
- **`lefthook.yml`** — git hooks mirroring CI (gitleaks, conventional commits, affected CI)
- **`.impeccable.md`** — design context placeholder (for impeccable plugin)

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

## Options

| Flag | Description |
|---|---|
| `--yes` / `-y` | Skip all prompts, use defaults / detected values |
| `--type <rust\|node\|python\|monorepo>` | Override project type detection |
| `--name <name>` | Project name (defaults to directory name) |
| `--only <a,b,c>` | Install only listed components: `claude,hooks,lefthook,impeccable` |
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

## Terrarium federation

This package is part of the `agentic` monorepo (`unsigned-gg/agentic`), a
terrarium-federated node. Standards: moon workspace, proto-pinned toolchains,
conventional signed commits, release-please, affected-only CI + gitleaks.
