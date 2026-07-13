import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type ProjectType = "rust" | "node" | "python" | "go" | "monorepo";

export interface DetectedProject {
	type: ProjectType;
	name: string;
	root: string;
	/** Additional signals found during detection */
	signals: string[];
}

const MARKERS: Record<string, ProjectType> = {
	"Cargo.toml": "rust",
	"package.json": "node",
	"pyproject.toml": "python",
	"go.mod": "go",
};

/**
 * Detect project type by scanning for marker files in the target directory.
 * Monorepo is detected by presence of .moon/workspace.yml or pnpm-workspace.yaml.
 */
export function detectProject(cwd: string = process.cwd()): DetectedProject {
	const root = resolve(cwd);
	const signals: string[] = [];
	const dirName = root.split("/").pop() ?? "project";

	// Monorepo detection takes priority
	for (const marker of [".moon/workspace.yml", "pnpm-workspace.yaml", "melos.yaml"]) {
		if (existsSync(join(root, marker))) {
			signals.push(marker);
			return { type: "monorepo", name: dirName, root, signals };
		}
	}

	// Single-language detection — first marker wins (a project could have both
	// Cargo.toml and package.json, but the primary language is what we optimize for)
	for (const [marker, type] of Object.entries(MARKERS)) {
		if (existsSync(join(root, marker))) {
			signals.push(marker);
			const name = extractName(root, type, marker);
			return { type, name, root, signals };
		}
	}

	// No marker files found — default to a generic project
	return { type: "node", name: dirName, root, signals: [] };
}

function extractName(root: string, type: ProjectType, marker: string): string {
	try {
		const content = readFileSync(join(root, marker), "utf-8");
		switch (type) {
			case "rust": {
				const match = content.match(/^name\s*=\s*"([^"]+)"/m);
				return match?.[1] ?? root.split("/").pop() ?? "project";
			}
			case "node": {
				const pkg = JSON.parse(content);
				return pkg.name ?? root.split("/").pop() ?? "project";
			}
			case "python": {
				const match = content.match(/^name\s*=\s*"([^"]+)"/m);
				return match?.[1] ?? root.split("/").pop() ?? "project";
			}
			case "go": {
				// go.mod first line is "module <name>"
				const match = content.match(/^module\s+(\S+)/m);
				return match?.[1]?.split("/").pop() ?? root.split("/").pop() ?? "project";
			}
			default:
				return root.split("/").pop() ?? "project";
		}
	} catch {
		return root.split("/").pop() ?? "project";
	}
}
