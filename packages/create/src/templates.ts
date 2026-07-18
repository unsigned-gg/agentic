import type { ProjectType } from "./detect.ts";

export interface TemplateFile {
	/** Relative path from project root */
	path: string;
	content: string;
}

export interface TemplateContext {
	name: string;
	type: ProjectType;
}

// ─── CLAUDE.md templates ────────────────────────────────────────────────────

function claudeMd(ctx: TemplateContext): string {
	const { name, type } = ctx;
	const typeHeader =
		type === "monorepo"
			? "Monorepo"
			: type.charAt(0).toUpperCase() + type.slice(1);

	const buildSection = buildCommands(type);
	const testSection = testCommands(type);
	const lintSection = lintCommands(type);
	const securitySection = securityCommands(type);
	const releaseSection = releaseCommands(type);

	return `# CLAUDE.md — ${name} (${typeHeader})

## Project
${type === "monorepo" ? "Monorepo managed by moon + proto." : `${typeHeader} project:`}

${buildSection}
## Test
${testSection}
## Lint & Format
${lintSection}
## Security
${securitySection}
## Release
${releaseSection}
## Commit Discipline
- Conventional commits (feat/fix/chore/docs/refactor/test/ci/build/infra/security), **signed**, **no AI attribution**.
- \`feat:\` → minor, \`fix:\` → patch, \`feat!:\` → major. \`chore:\`/\`docs:\` → no bump.
- Never hand-edit CHANGELOG.md — release-please generates it from commits.

## Git
- Feature branch → **PR** → **human-gated merge**. Never direct-push to main.
- Hooks (see \`.claude/README.md\`):
  - \`guard-main-push\` — denies direct push to main (override: \`# allow-direct-push\`, surface it).
  - \`ci-gate\` — on \`git push\` → affected CI (bypass: \`SKIP_CI_GATE=1\`).
  - \`lint-on-edit\` — format-on-edit by file type (bypass: \`SKIP_LINT=1\`).
`;
}

function buildCommands(type: ProjectType): string {
	switch (type) {
		case "rust":
			return "- `cargo build` — debug build\n- `cargo build --release` — release build (LTO enabled)\n- `cargo run` — run the binary";
		case "node":
			return "- `pnpm install` — install dependencies\n- `pnpm build` — compile TypeScript\n- `pnpm dev` — development mode";
		case "python":
			return "- `uv sync` — install dependencies\n- `uv run python -m <module>` — run the project";
		case "go":
			return "- `go build ./...` — build all packages\n- `go run ./cmd/<name>` — run a binary";
		case "monorepo":
			return "- `moon run <project>:<task>` — run a task in a specific project\n- `moon ci --base origin/main` — affected CI gate";
		default:
			return "";
	}
}

function testCommands(type: ProjectType): string {
	switch (type) {
		case "rust":
			return "- `cargo nextest run` — run tests (preferred over `cargo test`)\n- `cargo nextest run -p <crate>` — test a specific crate\n- `cargo nextest run <test_name>` — run a single test";
		case "node":
			return '- `pnpm test` — run tests with Vitest\n- `pnpm test -- --run` — run once without watch mode\n- `pnpm test -- -t "name"` — run specific test';
		case "python":
			return '- `uv run pytest` — run all tests\n- `uv run pytest tests/test_foo.py` — specific file\n- `uv run pytest -k "name"` — specific test';
		case "go":
			return "- `go test ./...` — run all tests\n- `go test -run TestName ./...` — run specific test";
		case "monorepo":
			return "- `moon run <project>:test` — test a specific project\n- `moon ci --base origin/main` — affected CI (runs tests for changed projects)";
		default:
			return "";
	}
}

function lintCommands(type: ProjectType): string {
	switch (type) {
		case "rust":
			return "- `cargo fmt --check` — check formatting\n- `cargo fmt` — auto-format\n- `cargo clippy -- -D warnings -W clippy::pedantic` — full lint pass";
		case "node":
			return "- `pnpm run lint` — run Biome check (lint + format)\n- `pnpm run format` — auto-format with Biome";
		case "python":
			return "- `uv run ruff check .` — lint\n- `uv run ruff check . --fix` — lint with auto-fix\n- `uv run ruff format .` — format";
		case "go":
			return "- `gofmt -l .` — check formatting\n- `gofmt -w .` — auto-format\n- `go vet ./...` — static analysis";
		case "monorepo":
			return "- `moon run :format --affected` — format changed projects\n- Per-project lint via `moon run <project>:lint`";
		default:
			return "";
	}
}

function securityCommands(type: ProjectType): string {
	switch (type) {
		case "rust":
			return "- `cargo deny check` — license, advisory, ban checks\n- `cargo audit` — RUSTSEC advisory database scan";
		case "node":
			return "- `pnpm audit` — dependency vulnerability scan\n- `gitleaks protect --staged --redact` — pre-commit secret scan (hooked)";
		case "python":
			return "- `uv run pip-audit` — dependency vulnerability scan\n- `gitleaks protect --staged --redact` — pre-commit secret scan (hooked)";
		case "go":
			return "- `govulncheck ./...` — vulnerability scan\n- `gitleaks protect --staged --redact` — pre-commit secret scan (hooked)";
		case "monorepo":
			return "- `gitleaks protect --staged --redact` — pre-commit secret scan (hooked via lefthook)\n- Per-project security tasks via `moon run <project>:audit`";
		default:
			return "";
	}
}

function releaseCommands(_type: ProjectType): string {
	return "- Uses release-please for automated semver (conventional commits → version bumps).\n- Write conventional commits: `feat:` → minor, `fix:` → patch, `feat!:` → major.";
}

// ─── .claude/settings.json ──────────────────────────────────────────────────

function claudeSettings(ctx: TemplateContext): string {
	const { type } = ctx;
	const allowList = buildAllowList(type);
	return JSON.stringify(
		{
			$schema: "https://json.schemastore.org/claude-code-settings.json",
			attribution: { commit: "", pr: "" },
			permissions: {
				allow: allowList,
				deny: ["Bash(rm -rf /*)", "Bash(rm -rf ~)"],
				defaultMode: "default",
			},
			hooks: {
				PreToolUse: [
					{
						matcher: "Bash",
						hooks: [
							{
								type: "command",
								command:
									"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-main-push.sh",
								timeout: 5,
							},
							{
								type: "command",
								command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/ci-gate.sh",
								timeout: 1800,
							},
						],
					},
				],
				PostToolUse: [
					{
						matcher: "Write|Edit|MultiEdit",
						hooks: [
							{
								type: "command",
								command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint-on-edit.sh",
								timeout: 120,
							},
						],
					},
				],
			},
		},
		null,
		"\t",
	);
}

function buildAllowList(type: ProjectType): string[] {
	const base = ["Read", "Edit", "Write"];
	const universal = [
		"Bash(git add *)",
		"Bash(git commit *)",
		"Bash(git push)",
		"Bash(git fetch *)",
		"Bash(git status*)",
		"Bash(git diff*)",
		"Bash(git log*)",
		"Bash(git checkout *)",
		"Bash(rg *)",
		"Bash(grep *)",
		"Bash(jq *)",
		"Bash(gh pr *)",
		"Bash(gitleaks *)",
		"Bash(lefthook *)",
	];
	const typeSpecific: Record<ProjectType, string[]> = {
		rust: ["Bash(cargo *)", "Bash(rustup *)", "Bash(rustc *)"],
		node: [
			"Bash(pnpm *)",
			"Bash(npm *)",
			"Bash(bun *)",
			"Bash(npx *)",
			"Bash(node *)",
		],
		python: ["Bash(uv *)", "Bash(python3 *)", "Bash(python *)", "Bash(pip *)"],
		go: ["Bash(go *)"],
		monorepo: [
			"Bash(moon *)",
			"Bash(proto *)",
			"Bash(cargo *)",
			"Bash(pnpm *)",
			"Bash(npm *)",
			"Bash(uv *)",
			"Bash(python3 *)",
			"Bash(go *)",
		],
	};
	return [...universal, ...base, ...(typeSpecific[type] ?? [])];
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

const GUARD_MAIN_PUSH = `#!/usr/bin/env bash
# Deny direct push to main/master. Override: include "# allow-direct-push" in the command (and surface why).
input=$(cat); cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
case "$cmd" in *"# allow-direct-push"*) exit 0 ;; esac
if printf '%s' "$cmd" | grep -qE 'git +push.*(origin +)?(main|master)\\b' \\
   || { printf '%s' "$cmd" | grep -qE 'git +push' && [ "$(git branch --show-current 2>/dev/null)" = "main" ]; }; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Direct push to main is blocked — open a PR (feature branch). Override: append # allow-direct-push and surface why."}}'
fi
exit 0`;

const CI_GATE = `#!/usr/bin/env bash
# On \`git push\`, run the affected CI gate. Fail CLOSED on failure, fail SOFT if moon absent. Bypass: SKIP_CI_GATE=1.
[ "\${SKIP_CI_GATE:-}" = "1" ] && exit 0
input=$(cat); cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
printf '%s' "$cmd" | grep -qE '(^|&&|;| )git +push( |$)' || exit 0
# If moon exists, run affected CI; otherwise soft-skip (CI still enforces server-side).
command -v moon >/dev/null 2>&1 || { echo "moon absent — ci-gate skipped" >&2; exit 0; }
cd "\${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(moon ci --base origin/main 2>&1); then
  reason=$(printf '%s' "$out" | tail -15 | jq -Rsa . 2>/dev/null || printf '"moon ci failed"')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}' "$reason"
fi
exit 0`;

const LINT_ON_EDIT = `#!/usr/bin/env bash
# Format the edited file by type. Always exit 0 (advisory). Bypass: SKIP_LINT=1.
[ "\${SKIP_LINT:-}" = "1" ] && exit 0
input=$(cat); f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // ""')
[ -f "$f" ] || exit 0
case "$f" in
  *.rs) command -v cargo >/dev/null 2>&1 && cargo fmt -- "$f" 2>/dev/null ;;
  *.go) command -v gofmt >/dev/null 2>&1 && gofmt -w "$f" 2>/dev/null ;;
  *.py) command -v ruff  >/dev/null 2>&1 && ruff format "$f" 2>/dev/null ;;
  *.ts|*.tsx|*.js) command -v pnpm >/dev/null 2>&1 && pnpm exec prettier --write "$f" 2>/dev/null ;;
esac
exit 0`;

const CLAUDE_README = `# \`.claude/\` — harness surface

| Hook | Event | What | Bypass |
|---|---|---|---|
| \`guard-main-push\` | PreToolUse Bash | deny direct push to main | \`# allow-direct-push\` |
| \`ci-gate\` | PreToolUse Bash | on \`git push\` → \`moon ci\` | \`SKIP_CI_GATE=1\` |
| \`lint-on-edit\` | PostToolUse Write/Edit | format the edited file by type | \`SKIP_LINT=1\` |

**Permissions:** \`settings.json\` (committed, universally-safe) + \`settings.local.json\` (gitignored, per-machine). Attribution off; \`$schema\` pinned; hooks use \`\${CLAUDE_PROJECT_DIR}\` (worktree-safe).`;

// ─── lefthook.yml ───────────────────────────────────────────────────────────

const LEFTHOOK = `# Fast git hooks (lefthook) — mirror CI so "green before push = no CI surprise".
# commit-stage = light + fast; pre-push = the affected CI gate. Skip: LEFTHOOK=0.
commit-msg:
  commands:
    conventional:
      run: |
        head -1 {1} | grep -qE '^(feat|fix|perf|refactor|docs|test|ci|build|infra|security|style|chore)(\\(.+\\))?!?: .+' \\
        || { echo "commit-msg must be Conventional Commits: <type>(scope): <desc>  (types incl. infra, security)"; exit 1; }

pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks protect --staged --redact --no-banner
    format:
      glob: "*.{rs,ts,tsx,js,py,go}"
      run: moon run :format --affected 2>/dev/null || true   # fail-soft at commit; CI enforces

pre-push:
  commands:
    affected-ci:
      run: moon ci --base origin/main 2>/dev/null || true   # fail-soft if moon absent; CI enforces
`;

// ─── .impeccable.md ─────────────────────────────────────────────────────────

const IMPECCABLE = (name: string) => `# Design Context — ${name}

<!-- This file is the design context for the impeccable plugin (audit, critique, polish).
     It defines audience, anti-patterns, and design primitives so the agent can
     make consistent design decisions. Update it as the project's design language
     evolves. -->

## Audience
Technical researchers and curious technologists. Assume a technically literate
reader who wants depth, not hand-holding.

## Design Language
- Dark-mode first (warm dark, not pure black).
- High-contrast text for readability.
- Monospace for technical content (code, data, metrics).
- Minimal ornamentation — function over form.

## Accessibility (Pragmatic)
- Keyboard-complete: every interactive element reachable + operable via keyboard.
- Screen-reader-navigable: semantic HTML, ARIA where needed.
- Reduced-motion respected: \`prefers-reduced-motion\` disables animations.
- Color is accent-only, never the sole encoding of information.

## Anti-Patterns (Project-Specific)
- No accordions (content should be visible, not hidden behind clicks).
- No dark patterns in pixels (fake urgency, pre-checked upsells, dimmed "no thanks").
- No cargo-cult animations (motion must serve a purpose).
`;

// ─── .claude/settings.local.example.json ────────────────────────────────────

const SETTINGS_LOCAL_EXAMPLE = JSON.stringify(
	{
		$schema: "https://json.schemastore.org/claude-code-settings.json",
		permissions: {
			allow: [],
		},
	},
	null,
	"\t",
);

// ─── .gitignore additions ──────────────────────────────────────────────────

const GITIGNORE_ENTRIES = `.claude/settings.local.json
`;

// ─── Template registry ──────────────────────────────────────────────────────

export type Component =
	| "claude"
	| "hooks"
	| "lefthook"
	| "impeccable"
	| "terminal"
	| "harness"
	| "skills"
	| "local-models";

export const ALL_COMPONENTS: Component[] = [
	"claude",
	"hooks",
	"lefthook",
	"impeccable",
	"terminal",
	"harness",
	"skills",
	"local-models",
];

// ─── Terminal emulator configs (overflow + ghostty) ─────────────────────────

const OVERFLOW_CONFIG = `# overflow.toml — agent-aware terminal emulator
# Install overflow from https://github.com/unsigned-gg/overflow
# Copy to ~/.config/overflow/overflow.toml
[font]
family = "monospace"
size = 13.0
ligatures = false

[window]
fullscreen = false
opacity = 1.0
blur = false
decorations = "full"
title = "{cwd} — overflow"

[colors]
background = "#0a0a0a"
foreground = "#e0e0e0"
cursor = "#00e599"
selection = "#1a3a2a"

[colors.normal]
black   = "#1a1a1a"
red     = "#ff5555"
green   = "#00e599"
yellow  = "#f1fa8c"
blue    = "#4d9fff"
magenta = "#ff79c6"
cyan    = "#8be9fd"
white   = "#e0e0e0"

[colors.bright]
black   = "#44475a"
red     = "#ff6e6e"
green   = "#50fa7b"
yellow  = "#f1fa8c"
blue    = "#6aa9ff"
magenta = "#ff92de"
cyan    = "#a8e9ff"
white   = "#ffffff"

theme = "unsigned"

[tabs]
position = "top"
max_width = 200

[panes]
default_split_direction = "horizontal"

[mux]
backend = "herdr"
enabled = true
detach_on_close = true
socket_dir = "$HOME/.local/share/overflow/sockets"
agent_notifications = true
agent_tools = ["claude-code", "codex", "amp", "opencode"]

[remote]
mosh_enabled = true
mosh_port = 0
roaming = true
local_echo = true

[shell_integration]
enabled = true
block_detection = true
command_history = true
semantic_prompts = true

[scrollback]
limit = 10000

[keyboard]
protocol = "kitty"

[[keybindings]]
key = "Ctrl+Shift+C"
action = "copy"

[[keybindings]]
key = "Ctrl+Shift+V"
action = "paste"

[[keybindings]]
key = "Ctrl+Shift+P"
action = "toggle_command_palette"

[[keybindings]]
key = "Ctrl+Grave"
action = "toggle_quake_mode"

[[keybindings]]
key = "F11"
action = "toggle_fullscreen"

[images]
sixel = true
kitty_graphics = true
iterm2 = true

[dropdown]
enabled = true
toggle_key = "Ctrl+Grave"
animation = "slide"
height = "80%"

[command_palette]
toggle_key = "Ctrl+Shift+P"

[demon_mode]
enabled = true
toggle_key = "Ctrl+Alt+D"
gate_signoff_key = "Ctrl+Alt+Y"
dormancy_key = "Ctrl+Alt+Sleep"
reverie_port = 7437
llm_base_url = "https://llm.unsigned.gg/v1"
revenant_metrics_port = 9090

[attention_router]
enabled = true
auto_advance = true
hold_key = "Ctrl+Alt+H"
priority_order = ["permission", "input", "ready", "idle"]
window_isolation = true

[reverie]
enabled = true
base_url = "http://127.0.0.1:7437"
memory_persistence = "engram"
session_snapshots = true
block_history = true
sensing_interval = 5

[telemetry]
enabled = true
api_key = ""
endpoint = "https://us.i.posthog.com"
distinct_id = ""
`;

const OVERFLOW_THEME_UNSIGNED = `# unsigned — default overflow theme
background = "#0a0a0a"
foreground = "#e0e0e0"
cursor = "#00e599"
selection = "#1a3a2a"

[normal]
black   = "#1a1a1a"
red     = "#ff5555"
green   = "#00e599"
yellow  = "#f1fa8c"
blue    = "#4d9fff"
magenta = "#ff79c6"
cyan    = "#8be9fd"
white   = "#e0e0e0"

[bright]
black   = "#44475a"
red     = "#ff6e6e"
green   = "#50fa7b"
yellow  = "#f1fa8c"
blue    = "#6aa9ff"
magenta = "#ff92de"
cyan    = "#a8e9ff"
white   = "#ffffff"
`;

const GHOSTTY_CONFIG = `# ghostty config — agent-friendly terminal
# Install ghostty from https://ghostty.org
# Copy to ~/.config/ghostty/config

font-family = monospace
font-size = 13

# Colors — unsigned theme
background = 0a0a0a
foreground = e0e0e0
cursor-color = 00e599
selection-background = 1a3a2a

palette = 0=#1a1a1a
palette = 1=#ff5555
palette = 2=#00e599
palette = 3=#f1fa8c
palette = 4=#4d9fff
palette = 5=#ff79c6
palette = 6=#8be9fd
palette = 7=#e0e0e0
palette = 8=#44475a
palette = 9=#ff6e6e
palette = 10=#50fa7b
palette = 11=#f1fa8c
palette = 12=#6aa9ff
palette = 13=#ff92de
palette = 14=#a8e9ff
palette = 15=#ffffff

window-padding-x = 8
window-padding-y = 4
window-decoration = true

scrollback-limit = 10000

# Shell integration (OSC 133)
shell-integration = detect
shell-integration-features = cursor,sudo,title

# Copy/paste
copy-on-select = clipboard

# Key bindings
keybind = ctrl+shift+c=copy_to_clipboard
keybind = ctrl+shift+v=paste_from_clipboard
keybind = ctrl+shift+p=toggle_command_palette
keybind = ctrl+grave=toggle_quake_mode
keybind = f11=toggle_fullscreen

# Mouse
mouse-hide-while-typing = true

# Window
window-theme = dark
background-opacity = 1.0
`;

const SHELL_INTEGRATION_BASH = `#!/usr/bin/env bash
# overflow shell integration for Bash — source from .bashrc:
#   [ -f ~/.config/overflow/shell-integration/bash.sh ] && source ~/.config/overflow/shell-integration/bash.sh
# Emits OSC 133 semantic prompt markers for block detection + command history.
if [[ $- != *i* ]]; then return 0; fi
if [[ -n "$__OVERFLOW_SHELL_INTEGRATION" ]]; then return 0; fi
__OVERFLOW_SHELL_INTEGRATION=1

__overflow_prompt_start() { printf '\\e]133;A\\a'; }
__overflow_prompt_end()   { printf '\\e]133;B\\a'; }
__overflow_preexec()      { printf '\\e]133;C\\a'; }
__overflow_precmd()       { printf '\\e]133;D\\a'; }

PROMPT_COMMAND="__overflow_prompt_start; __overflow_precmd; \${PROMPT_COMMAND:-:}; __overflow_prompt_end"
trap '__overflow_preexec' DEBUG
`;

// ─── Agent harness configs ──────────────────────────────────────────────────

const OMP_MODELS = `# omp custom providers — unsigned model gateway + local endpoints.
# Seed to ~/.omp/agent/models.yml (only if absent — never clobber live config).
# Install omp: bun install -g @oh-my-pi/pi-coding-agent
providers:
  llm:
    baseUrl: https://llm.unsigned.gg/v1
    api: openai-completions
    apiKey: UNSIGNED_LLM_API_KEY
    compat:
      supportsStore: false
    models:
      - id: zai/GLM-5.2
        contextWindow: 200000
        reasoning: true
      - id: deepseek-ai/DeepSeek-V4-Pro
        contextWindow: 131072
        reasoning: true
      - id: Qwen/Qwen3-235B-A22B-Instruct-2507
        contextWindow: 262144
      - id: moonshotai/Kimi-K2.6
        contextWindow: 131072
      - id: openai/gpt-5.5
        contextWindow: 1050000
        reasoning: true
      - id: google/gemini-3.5-flash
        contextWindow: 1048576
        reasoning: true
      - id: moonshotai/kimi-k2.7-code
        contextWindow: 262144
      - id: mistralai/devstral-2512
        contextWindow: 262144
      - id: claude-sonnet-5
        contextWindow: 200000
        reasoning: true
      - id: claude-haiku-4-5
        contextWindow: 200000
      - id: claude-opus-4-8
        contextWindow: 200000
        reasoning: true
  ollama:
    baseUrl: http://localhost:11434/v1
    api: openai-completions
    apiKey: ollama
    discovery:
      type: ollama
    models:
      - id: qwen3.6-27b-mtp
        contextWindow: 32768
        reasoning: true
      - id: qwen3.5-9b-mtp
        contextWindow: 32768
        reasoning: true
  llamacpp:
    baseUrl: http://localhost:8080/v1
    api: openai-completions
    apiKey: none
    models:
      - id: local
        contextWindow: 32768
  vllm:
    baseUrl: http://localhost:8000/v1
    api: openai-completions
    apiKey: none
    models:
      - id: local
        contextWindow: 32768
`;

const OMP_CONFIG_LOCAL = `# omp local-model profile — slims the ~39k default to ~13k tokens for local 32k-context models.
# Seed to ~/.omp/agent/config.yml (only if absent).
# Escape hatch: gateway/frontier models (200k ctx)? Delete this file or set tools.discoveryMode: auto.
tools:
  discoveryMode: all
  essentialOverride: [read, bash, edit, write, glob, grep]
lsp:
  enabled: false
debug:
  enabled: false
astGrep:
  enabled: false
`;

const PI_MODELS = `{
  "providers": {
    "llm": {
      "baseUrl": "https://llm.unsigned.gg/v1",
      "api": "openai-completions",
      "apiKey": "env:UNSIGNED_LLM_API_KEY",
      "models": [
        { "id": "google/gemini-3.5-flash", "contextWindow": 1048576, "reasoning": true },
        { "id": "zai/GLM-5.2", "contextWindow": 200000, "reasoning": true },
        { "id": "deepseek-ai/DeepSeek-V4-Pro", "contextWindow": 131072, "reasoning": true },
        { "id": "openai/gpt-5.5", "contextWindow": 1050000, "reasoning": true },
        { "id": "claude-sonnet-5", "contextWindow": 200000, "reasoning": true },
        { "id": "claude-haiku-4-5", "contextWindow": 200000 }
      ]
    },
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "qwen3.6-27b-mtp", "contextWindow": 32768, "reasoning": true }
      ]
    },
    "llamacpp": {
      "baseUrl": "http://localhost:8080/v1",
      "api": "openai-completions",
      "apiKey": "none",
      "models": [{ "id": "local" }]
    }
  }
}
`;

const OPENCODE_CONFIG = `{
  "$schema": "https://opencode.ai/config.json",
  "model": "llm/google/gemini-3.5-flash",
  "provider": {
    "llm": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llm (unsigned model gateway)",
      "options": {
        "baseURL": "https://llm.unsigned.gg/v1"
      },
      "models": {
        "zai/GLM-5.2": { "name": "GLM-5.2 (Crusoe)" },
        "google/gemini-3.5-flash": { "name": "Gemini 3.5 Flash (OpenRouter)" },
        "openai/gpt-5.5": { "name": "GPT-5.5 (OpenRouter)" },
        "deepseek-ai/DeepSeek-V4-Pro": { "name": "DeepSeek-V4-Pro (Crusoe)" },
        "claude-sonnet-5": { "name": "Claude Sonnet 5 (Anthropic)" },
        "claude-haiku-4-5": { "name": "Claude Haiku 4.5 (Anthropic)" }
      }
    }
  }
}
`;

const HERMES_CONFIG = `# hermes-agent config — local OpenAI-compatible endpoint.
# Seed to ~/.hermes/cli-config.yaml (only if absent).
# Install: uv tool install hermes-agent[anthropic]
openai_base_url: http://localhost:8000/v1
openai_api_key: none
model: local
`;

// ─── Skills install script ─────────────────────────────────────────────────

const SKILLS_INSTALL = `#!/usr/bin/env bash
# Symlink agentskills.io skills into every harness's skills directory.
# Idempotent; symlinks mean edits are live everywhere at once.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
TARGETS=(
  "\${HOME}/.pi/agent/skills"
  "\${HOME}/.config/opencode/skills"
  "\${HOME}/.hermes/skills"
  "\${HOME}/.omp/agent/skills"
  "\${HOME}/.agents/skills"
)

linked=0
for target in "\${TARGETS[@]}"; do
  mkdir -p "$target"
  for skill in "\${PKG_DIR}"/*/; do
    name="$(basename "$skill")"
    [ -f "\${skill}SKILL.md" ] || continue
    ln -sfn "\${skill%/}" "\${target}/\${name}"
    linked=$((linked + 1))
  done
done
echo "skills linked: \${linked} links across \${#TARGETS[@]} harness dirs"
`;

// ─── Local model probe script ──────────────────────────────────────────────

const PROBE_SCRIPT = `#!/usr/bin/env bash
# Hardware probe → tiered model recommendation for local LLM serving.
# Detects GPU VRAM, CPU cores, RAM → recommends model size and serving backend.
set -euo pipefail

echo "=== Hardware Probe ==="

# GPU
if command -v nvidia-smi >/dev/null 2>&1; then
  vram_mb=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
  gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
  echo "GPU: \${gpu_name} (\${vram_mb} MB VRAM)"
elif command -v rocminfo >/dev/null 2>&1; then
  echo "GPU: AMD ROCm detected"
  vram_mb=0
elif command -v mps >/dev/null 2>&1 || [ -d /dev/dri ]; then
  echo "GPU: Integrated graphics detected"
  vram_mb=512
else
  echo "GPU: None (CPU-only inference)"
  vram_mb=0
fi

# CPU + RAM
cpu_cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
ram_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo 8)
echo "CPU: \${cpu_cores} cores"
echo "RAM: \${ram_gb} GB"

echo ""
echo "=== Recommendation ==="
vram_gb=$((vram_mb / 1024))
if [ "\${vram_gb}" -ge 48 ]; then
  echo "Tier: HIGH — can run 70B+ models"
  echo "  ollama pull qwen3.6-72b or serve via vLLM"
  echo "  Context: 32k+ native"
elif [ "\${vram_gb}" -ge 24 ]; then
  echo "Tier: MEDIUM — 27-35B models, Q4 quantized"
  echo "  ollama pull qwen3.6-27b-mtp"
  echo "  Context: 32k with Q4_K_M"
elif [ "\${vram_gb}" -ge 12 ]; then
  echo "Tier: ENTRY — 9-14B models"
  echo "  ollama pull qwen3.5-9b-mtp"
  echo "  Context: 32k, Q4_K_M"
elif [ "\${vram_gb}" -ge 8 ]; then
  echo "Tier: LIGHT — 7B models, Q4"
  echo "  ollama pull qwen2.5-7b"
  echo "  Context: 8k-32k depending on model"
else
  echo "Tier: CPU-ONLY — use gateway models (llm.unsigned.gg)"
  echo "  Local serving not recommended for agent workloads"
  echo "  Set UNSIGNED_LLM_API_KEY and use the gateway directly"
fi

echo ""
echo "=== Serving backends ==="
echo "  ollama :11434  — zero-friction, pull + go"
echo "  llama.cpp :8080 — GGUF, full control, --jinja for tool calls"
echo "  vLLM :8000     — production, --enable-auto-tool-choice"
echo ""
echo "All serve OpenAI-compatible on fixed ports — every harness preset is pre-wired."
`;

// ─── Template registry ─────────────────────────────────────────────────────

export function getTemplateFiles(
	ctx: TemplateContext,
	components: Component[],
): TemplateFile[] {
	const files: TemplateFile[] = [];

	for (const component of components) {
		switch (component) {
			case "claude":
				files.push(
					{ path: "CLAUDE.md", content: claudeMd(ctx) },
					{ path: ".claude/settings.json", content: claudeSettings(ctx) },
					{ path: ".claude/README.md", content: CLAUDE_README },
					{
						path: ".claude/settings.local.example.json",
						content: SETTINGS_LOCAL_EXAMPLE,
					},
					{ path: ".gitignore.create", content: GITIGNORE_ENTRIES },
				);
				break;
			case "hooks":
				files.push(
					{
						path: ".claude/hooks/guard-main-push.sh",
						content: GUARD_MAIN_PUSH,
					},
					{ path: ".claude/hooks/ci-gate.sh", content: CI_GATE },
					{ path: ".claude/hooks/lint-on-edit.sh", content: LINT_ON_EDIT },
				);
				break;
			case "lefthook":
				files.push({ path: "lefthook.yml", content: LEFTHOOK });
				break;
			case "impeccable":
				files.push({ path: ".impeccable.md", content: IMPECCABLE(ctx.name) });
				break;
			case "terminal":
				files.push(
					{ path: ".config/overflow/overflow.toml", content: OVERFLOW_CONFIG },
					{
						path: ".config/overflow/themes/unsigned.toml",
						content: OVERFLOW_THEME_UNSIGNED,
					},
					{
						path: ".config/overflow/shell-integration/bash.sh",
						content: SHELL_INTEGRATION_BASH,
					},
					{ path: ".config/ghostty/config", content: GHOSTTY_CONFIG },
				);
				break;
			case "harness":
				files.push(
					{ path: ".agent-config/omp/models.yml", content: OMP_MODELS },
					{
						path: ".agent-config/omp/config.local.yml",
						content: OMP_CONFIG_LOCAL,
					},
					{ path: ".agent-config/pi/models.json", content: PI_MODELS },
					{
						path: ".agent-config/opencode/opencode.json",
						content: OPENCODE_CONFIG,
					},
					{
						path: ".agent-config/hermes/cli-config.yaml",
						content: HERMES_CONFIG,
					},
				);
				break;
			case "skills":
				files.push({
					path: ".agent-config/skills/install.sh",
					content: SKILLS_INSTALL,
				});
				break;
			case "local-models":
				files.push({
					path: ".agent-config/local-models/probe.sh",
					content: PROBE_SCRIPT,
				});
				break;
		}
	}

	return files;
}
