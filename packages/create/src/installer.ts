import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { detectProject, type ProjectType } from "./detect.ts";
import {
	ALL_COMPONENTS,
	type Component,
	getTemplateFiles,
	type TemplateFile,
} from "./templates.ts";

// ─── ANSI ──────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function bold(s: string): string {
	return `${BOLD}${s}${RESET}`;
}
function dim(s: string): string {
	return `${DIM}${s}${RESET}`;
}
function green(s: string): string {
	return `${GREEN}${s}${RESET}`;
}
function yellow(s: string): string {
	return `${YELLOW}${s}${RESET}`;
}
function blue(s: string): string {
	return `${BLUE}${s}${RESET}`;
}
function red(s: string): string {
	return `${RED}${s}${RESET}`;
}
function cyan(s: string): string {
	return `${CYAN}${s}${RESET}`;
}

// ─── Banner ─────────────────────────────────────────────────────────────────

const BANNER = `
${cyan("╔════════════════════════════════════════════════════════╗")}
${cyan("║")}  ${bold("unsigned-gg/create")}                                ${cyan("║")}
${cyan("║")}  ${dim("cerebral/unsigned agent tooling installer")}           ${cyan("║")}
${cyan("╚════════════════════════════════════════════════════════╝")}
`;

// ─── Prompt utilities ───────────────────────────────────────────────────────

function write(msg: string): void {
	process.stdout.write(msg);
}

function readline(): Promise<string> {
	return new Promise((resolvePromise) => {
		process.stdin.setEncoding("utf-8");
		process.stdin.resume();
		process.stdin.once("data", (data) => {
			process.stdin.pause();
			resolvePromise(String(data).trim());
		});
	});
}

async function prompt(
	question: string,
	defaultValue?: string,
): Promise<string> {
	const hint =
		defaultValue !== undefined ? ` ${dim(`(${defaultValue})`)} ` : " ";
	write(`${question}${hint}${dim("›")} `);
	const answer = await readline();
	return answer || defaultValue || "";
}

async function confirm(
	question: string,
	defaultValue: boolean = false,
): Promise<boolean> {
	const hint = defaultValue ? `${dim("[Y/n]")}` : `${dim("[y/N]")}`;
	write(`${question} ${hint} `);
	const answer = (await readline()).toLowerCase();
	if (answer === "") return defaultValue;
	return answer === "y" || answer === "yes";
}

async function select<T extends string>(
	question: string,
	options: readonly T[],
	defaultOption: T,
): Promise<T> {
	write(`${question}\n`);
	for (let i = 0; i < options.length; i++) {
		const marker =
			options[i] === defaultOption ? `${green("◆")}` : `${dim("○")}`;
		write(`  ${marker} ${dim(`[${i + 1}]`)} ${options[i]}\n`);
	}
	write(`${dim("›")} `);
	const answer = await readline();
	const idx = Number.parseInt(answer, 10) - 1;
	if (Number.isNaN(idx) || idx < 0 || idx >= options.length)
		return defaultOption;
	return options[idx] ?? defaultOption;
}

// ─── Checksum display ───────────────────────────────────────────────────────

const CHECK = green("✓");
const CROSS = red("✗");
const SKIP = dim("·");

// ─── Install ────────────────────────────────────────────────────────────────

export interface InstallOptions {
	cwd: string;
	// `| undefined` is deliberate: callers forward optional CLI args verbatim
	// under exactOptionalPropertyTypes.
	type?: ProjectType | undefined;
	name?: string | undefined;
	components?: Component[] | undefined;
	yes: boolean;
	force: boolean;
	dryRun: boolean;
}

export interface InstallResult {
	written: string[];
	skipped: string[];
	overwritten: string[];
}

export async function install(opts: InstallOptions): Promise<InstallResult> {
	const cwd = resolve(opts.cwd);

	// 1. Detect
	const detected = detectProject(cwd);
	const type: ProjectType = opts.type ?? detected.type;
	const name = opts.name ?? detected.name;

	if (!opts.yes) {
		write(`${blue("◆")} ${bold("Project detected")}\n`);
		write(`  ${dim("type:")}  ${type}\n`);
		write(`  ${dim("name:")}  ${name}\n`);
		if (detected.signals.length > 0) {
			write(`  ${dim("found:")} ${detected.signals.join(", ")}\n`);
		}
		write("\n");

		if (opts.type === undefined && detected.signals.length === 0) {
			const correct = await confirm(
				`${yellow("!")} No project markers found. Is this a ${type} project?`,
				true,
			);
			if (!correct) {
				const newType = await select(
					"Select project type:",
					["rust", "node", "python", "go", "monorepo"] as const,
					"node" as const,
				);
				return install({ ...opts, type: newType, yes: false });
			}
		}
	}

	// 2. Select components
	let components: Component[] = opts.components ?? ALL_COMPONENTS;
	if (!opts.yes && opts.components === undefined) {
		write(`${blue("◆")} ${bold("Select components")}\n`);
		const selected = new Set<Component>(ALL_COMPONENTS);
		for (const component of ALL_COMPONENTS) {
			const desc: Record<Component, string> = {
				claude: "CLAUDE.md + .claude/settings.json + README",
				hooks: ".claude/hooks/ (guard-main-push, ci-gate, lint-on-edit)",
				lefthook: "lefthook.yml (gitleaks, conventional commits, affected CI)",
				impeccable: ".impeccable.md (design context placeholder)",
				terminal: "overflow.toml + ghostty config (agent-aware terminal)",
				harness: "omp/pi/opencode/hermes config presets (model gateway)",
				skills: "agentskills.io symlink installer (shared across harnesses)",
				"local-models": "hardware probe script (GPU/VRAM → model tier)",
			};
			const yes = await confirm(`  ${component} ${dim(desc[component])}`, true);
			if (yes) selected.add(component);
			else selected.delete(component);
		}
		components = [...selected];
		write("\n");
	}

	// 3. Generate files
	const files = getTemplateFiles({ name, type }, components);

	if (files.length === 0) {
		write(`${yellow("!")} No components selected — nothing to do.\n`);
		return { written: [], skipped: [], overwritten: [] };
	}

	// 4. Show plan
	if (!opts.yes) {
		write(
			`${blue("◆")} ${bold("Files to install")} ${dim(`(${files.length})`)}\n`,
		);
		for (const file of files) {
			const exists = existsSync(join(cwd, file.path));
			const status = exists ? yellow("(exists)") : green("(new)");
			write(`  ${status} ${file.path}\n`);
		}
		write("\n");
		if (!opts.force) {
			const proceed = await confirm("Proceed with installation?", true);
			if (!proceed) {
				write(`${red("✗")} Aborted.\n`);
				return { written: [], skipped: [], overwritten: [] };
			}
		}
	}

	// 5. Write files
	const result: InstallResult = { written: [], skipped: [], overwritten: [] };

	if (opts.dryRun) {
		write(`${yellow("[DRY RUN]")} No files will be written.\n`);
		for (const file of files) {
			write(`  ${SKIP} ${dim("would write")} ${file.path}\n`);
		}
		return result;
	}

	for (const file of files) {
		const fullPath = join(cwd, file.path);
		const exists = existsSync(fullPath);

		if (exists && !opts.force) {
			if (!opts.yes) {
				const overwrite = await confirm(
					`  ${yellow("!")} Overwrite ${file.path}?`,
					false,
				);
				if (!overwrite) {
					result.skipped.push(file.path);
					write(`  ${SKIP} ${dim("skipped")} ${file.path}\n`);
					continue;
				}
			} else {
				result.skipped.push(file.path);
				continue;
			}
		}

		// Special handling: .gitignore.create → append entries to .gitignore
		if (file.path === ".gitignore.create") {
			const entries = file.content;
			const gitignorePath = join(cwd, ".gitignore");
			if (existsSync(gitignorePath)) {
				const existing = readFileSync(gitignorePath, "utf-8");
				if (!existing.includes(entries.trim())) {
					const newContent = existing.endsWith("\n")
						? existing + "\n" + entries
						: existing + "\n" + entries;
					writeFileSync(gitignorePath, newContent);
					result.written.push(".gitignore (appended)");
					write(`  ${CHECK} ${dim("appended")} .gitignore\n`);
				} else {
					result.skipped.push(".gitignore (already present)");
					write(`  ${SKIP} ${dim("already present")} .gitignore\n`);
				}
			} else {
				writeFileSync(gitignorePath, entries);
				result.written.push(".gitignore");
				write(`  ${CHECK} ${green("created")} .gitignore\n`);
			}
			continue;
		}

		// Create directories as needed
		const dir = dirname(fullPath);
		mkdirSync(dir, { recursive: true });

		writeFileSync(fullPath, file.content);
		if (exists) {
			result.overwritten.push(file.path);
			write(`  ${CHECK} ${yellow("overwritten")} ${file.path}\n`);
		} else {
			result.written.push(file.path);
			write(`  ${CHECK} ${green("created")} ${file.path}\n`);
		}
	}

	// 6. Make scripts executable (hooks + terminal integration + skills + probe)
	const executableScripts = [
		...(components.includes("hooks")
			? [
					".claude/hooks/guard-main-push.sh",
					".claude/hooks/ci-gate.sh",
					".claude/hooks/lint-on-edit.sh",
				]
			: []),
		...(components.includes("terminal")
			? [".config/overflow/shell-integration/bash.sh"]
			: []),
		...(components.includes("skills")
			? [".agent-config/skills/install.sh"]
			: []),
		...(components.includes("local-models")
			? [".agent-config/local-models/probe.sh"]
			: []),
	];
	if (executableScripts.length > 0 && !opts.dryRun) {
		write(`\n${blue("◆")} ${bold("Making scripts executable")}\n`);
		for (const scriptPath of executableScripts) {
			const fullPath = join(cwd, scriptPath);
			if (existsSync(fullPath)) {
				try {
					chmodSync(fullPath, 0o755);
					write(`  ${CHECK} ${dim("chmod +x")} ${scriptPath}\n`);
				} catch {
					write(`  ${SKIP} ${dim("chmod skipped")} ${scriptPath}\n`);
				}
			}
		}
	}

	// 7. Wire lefthook
	if (components.includes("lefthook") && !opts.dryRun) {
		write(`\n${blue("◆")} ${bold("Lefthook")}\n`);
		write(
			`  ${dim("Run")} \`lefthook install\` ${dim("if lefthook is installed, to wire git hooks.")}\n`,
		);
	}

	// 8. Next-steps guidance for agent tooling
	const hasAgentTooling = components.some(
		(c) =>
			c === "terminal" ||
			c === "harness" ||
			c === "skills" ||
			c === "local-models",
	);
	if (hasAgentTooling && !opts.dryRun) {
		write(`\n${blue("◆")} ${bold("Agent tooling setup")}\n`);
		if (components.includes("harness")) {
			write(`  ${dim("Config presets written to")} .agent-config/\n`);
			write(
				`  ${dim("Seed to home dirs:")} cp -n .agent-config/omp/models.yml ~/.omp/agent/models.yml\n`,
			);
			write(
				`  ${dim("                ")} cp -n .agent-config/pi/models.json ~/.pi/agent/models.json\n`,
			);
			write(
				`  ${dim("                ")} cp -n .agent-config/opencode/opencode.json ~/.config/opencode/opencode.json\n`,
			);
			write(
				`  ${dim("                ")} cp -n .agent-config/hermes/cli-config.yaml ~/.hermes/cli-config.yaml\n`,
			);
			write(
				`  ${dim("Set")} UNSIGNED_LLM_API_KEY ${dim("for gateway access (llm.unsigned.gg/v1)")}\n`,
			);
		}
		if (components.includes("terminal")) {
			write(
				`  ${dim("Terminal configs in")} .config/overflow/ ${dim("and")} .config/ghostty/\n`,
			);
			write(
				`  ${dim("Install overflow:")} cargo install overflow ${dim("(or from releases)")}\n`,
			);
			write(`  ${dim("Install ghostty:")}  https://ghostty.org\n`);
		}
		if (components.includes("skills")) {
			write(
				`  ${dim("Run")} .agent-config/skills/install.sh ${dim("to symlink skills into all harness dirs")}\n`,
			);
		}
		if (components.includes("local-models")) {
			write(
				`  ${dim("Run")} .agent-config/local-models/probe.sh ${dim("to detect GPU + recommend model tier")}\n`,
			);
		}
	}

	return result;
}

// ─── CLI parsing ─────────────────────────────────────────────────────────────

interface CliArgs {
	cwd: string;
	type?: ProjectType;
	name?: string;
	components?: Component[];
	yes: boolean;
	force: boolean;
	dryRun: boolean;
	help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		cwd: process.cwd(),
		yes: false,
		force: false,
		dryRun: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		switch (arg) {
			case "--yes":
			case "-y":
				args.yes = true;
				break;
			case "--force":
			case "-f":
				args.force = true;
				break;
			case "--dry-run":
				args.dryRun = true;
				break;
			case "--help":
			case "-h":
				args.help = true;
				break;
			case "--cwd":
				args.cwd = argv[++i] ?? process.cwd();
				break;
			case "--type": {
				const t = argv[++i];
				if (t && ["rust", "node", "python", "go", "monorepo"].includes(t)) {
					args.type = t as ProjectType;
				}
				break;
			}
			case "--name": {
				const v = argv[++i];
				if (v !== undefined) args.name = v;
				break;
			}
			case "--only": {
				const parts = argv[++i]?.split(",") ?? [];
				args.components = parts.filter((p): p is Component =>
					ALL_COMPONENTS.includes(p as Component),
				);
				break;
			}
			default:
				if (arg.startsWith("--")) {
					// unknown flag — ignore
				}
				break;
		}
	}

	return args;
}

const HELP = `
${bold("@unsigned-gg/create")} ${dim("v0.1.0")}

  PostHog-style install wizard for cerebral/unsigned standard agent tooling.

${bold("USAGE")}
  npx @unsigned-gg/create [options]

${bold("OPTIONS")}
  ${dim("--yes, -y")}         Skip all prompts, use defaults / detected values
  ${dim("--type <type>")}     Override detection: rust|node|python|go|monorepo
  ${dim("--name <name>")}     Project name (defaults to directory name)
  ${dim("--only <a,b,c>")}    Install only: claude,hooks,lefthook,impeccable,
                         terminal,harness,skills,local-models
  ${dim("--force, -f")}       Overwrite existing files without prompting
  ${dim("--dry-run")}         Show what would be installed without writing
  ${dim("--cwd <path>")}     Target directory (defaults to current directory)
  ${dim("--help, -h")}       Show this help

${bold("EXAMPLES")}
  ${dim("# Interactive (default)")}
  npx @unsigned-gg/create

  ${dim("# Non-interactive (CI / scripting)")}
  npx @unsigned-gg/create --yes --type rust --name my-crate

  ${dim("# Install only specific components")}
  npx @unsigned-gg/create --only claude,hooks

  ${dim("# Full agentic tooling")}
  npx @unsigned-gg/create --only terminal,harness,skills,local-models

  ${dim("# Dry run")}
  npx @unsigned-gg/create --dry-run

${bold("COMPONENTS")}
  ${dim("claude")}          CLAUDE.md + .claude/settings.json + .claude/README.md
  ${dim("hooks")}           .claude/hooks/ (guard-main-push, ci-gate, lint-on-edit)
  ${dim("lefthook")}        lefthook.yml (gitleaks, conventional commits, affected CI)
  ${dim("impeccable")}     .impeccable.md (design context placeholder)
  ${dim("terminal")}       overflow.toml + ghostty config (agent-aware terminal)
  ${dim("harness")}        omp/pi/opencode/hermes config presets (model gateway)
  ${dim("skills")}         agentskills.io symlink installer (shared across harnesses)
  ${dim("local-models")}   hardware probe script (GPU/VRAM → model tier)
`;

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function main(argv: string[]): Promise<void> {
	const args = parseArgs(argv);

	if (args.help) {
		write(HELP);
		return;
	}

	write(BANNER);
	write(`  ${dim("Detecting project...")}\n\n`);

	try {
		const result = await install({
			cwd: args.cwd,
			type: args.type,
			name: args.name,
			components: args.components,
			yes: args.yes,
			force: args.force,
			dryRun: args.dryRun,
		});

		const total = result.written.length + result.overwritten.length;
		if (total > 0) {
			write(
				`\n${green("✓")} ${bold(`Installed ${total} file${total === 1 ? "" : "s"}`)}`,
			);
			if (result.skipped.length > 0)
				write(` ${dim(`(${result.skipped.length} skipped)`)}`);
			write("\n");
			write(`\n  ${dim("Next steps:")}\n`);
			write(
				`  ${dim("1. Review")} CLAUDE.md ${dim("and update project-specific details")}\n`,
			);
			write(
				`  ${dim("2. Commit the config:")} git add CLAUDE.md .claude/ lefthook.yml .impeccable.md\n`,
			);
			write(`  ${dim("3. Install lefthook:")} lefthook install\n`);
			write(`\n${cyan("Done.")}\n`);
		} else if (result.skipped.length === 0 && !args.dryRun) {
			write(`\n${yellow("!")} Nothing was installed.\n`);
		}
	} catch (err) {
		write(
			`\n${red("✗")} ${err instanceof Error ? err.message : "Unknown error"}\n`,
		);
		process.exitCode = 1;
	}
}
