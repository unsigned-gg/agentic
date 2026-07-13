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
	const typeHeader = type === "monorepo" ? "Monorepo" : type.charAt(0).toUpperCase() + type.slice(1);

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
			return "- `pnpm test` — run tests with Vitest\n- `pnpm test -- --run` — run once without watch mode\n- `pnpm test -- -t \"name\"` — run specific test";
		case "python":
			return "- `uv run pytest` — run all tests\n- `uv run pytest tests/test_foo.py` — specific file\n- `uv run pytest -k \"name\"` — specific test";
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
			return "- `moon run :format --affected` — format changed projects\n- Per-project lint via \`moon run <project>:lint\`";
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
			return "- `gitleaks protect --staged --redact` — pre-commit secret scan (hooked via lefthook)\n- Per-project security tasks via \`moon run <project>:audit\`";
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
							{ type: "command", command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-main-push.sh", timeout: 5 },
							{ type: "command", command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/ci-gate.sh", timeout: 1800 },
						],
					},
				],
				PostToolUse: [
					{
						matcher: "Write|Edit|MultiEdit",
						hooks: [{ type: "command", command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/lint-on-edit.sh", timeout: 120 }],
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
		node: ["Bash(pnpm *)", "Bash(npm *)", "Bash(bun *)", "Bash(npx *)", "Bash(node *)"],
		python: ["Bash(uv *)", "Bash(python3 *)", "Bash(python *)", "Bash(pip *)"],
		go: ["Bash(go *)"],
		monorepo: ["Bash(moon *)", "Bash(proto *)", "Bash(cargo *)", "Bash(pnpm *)", "Bash(npm *)", "Bash(uv *)", "Bash(python3 *)", "Bash(go *)"],
	};
	return [...universal, ...base, ...typeSpecific[type] ?? []];
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

export type Component = "claude" | "hooks" | "lefthook" | "impeccable";

export const ALL_COMPONENTS: Component[] = ["claude", "hooks", "lefthook", "impeccable"];

export function getTemplateFiles(ctx: TemplateContext, components: Component[]): TemplateFile[] {
	const files: TemplateFile[] = [];

	for (const component of components) {
		switch (component) {
			case "claude":
				files.push(
					{ path: "CLAUDE.md", content: claudeMd(ctx) },
					{ path: ".claude/settings.json", content: claudeSettings(ctx) },
					{ path: ".claude/README.md", content: CLAUDE_README },
					{ path: ".claude/settings.local.example.json", content: SETTINGS_LOCAL_EXAMPLE },
					{ path: ".gitignore.create", content: GITIGNORE_ENTRIES },
				);
				break;
			case "hooks":
				files.push(
					{ path: ".claude/hooks/guard-main-push.sh", content: GUARD_MAIN_PUSH },
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
		}
	}

	return files;
}
