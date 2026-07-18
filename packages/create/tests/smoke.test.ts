// Smoke gates for the install wizard (OPS-731): project detection and
// template generation stay coherent without running the interactive CLI.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectProject } from "../src/detect";
import { ALL_COMPONENTS, getTemplateFiles } from "../src/templates";

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "create-smoke-"));
}

describe("detectProject", () => {
  test("Cargo.toml marks a rust project", () => {
    const dir = scratch();
    writeFileSync(join(dir, "Cargo.toml"), "[package]\n");
    expect(detectProject(dir).type).toBe("rust");
  });

  test("moon workspace wins over language markers (monorepo priority)", () => {
    const dir = scratch();
    writeFileSync(join(dir, "package.json"), "{}");
    mkdirSync(join(dir, ".moon"));
    writeFileSync(join(dir, ".moon/workspace.yml"), "projects: []\n");
    expect(detectProject(dir).type).toBe("monorepo");
  });
});

describe("getTemplateFiles", () => {
  const ctx = { name: "smoke", type: "node" as const };
  const files = getTemplateFiles(ctx, ALL_COMPONENTS);

  test("all components render at least one file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test("rendered paths are unique and relative", () => {
    const paths = files.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p, p).not.toStartWith("/");
  });

  test("rendered files are non-empty and secret-free", () => {
    for (const f of files) {
      expect(f.content.length, f.path).toBeGreaterThan(0);
      for (const needle of ["sk-", "ghp_", "AKIA"]) {
        expect(f.content, `${f.path}: ${needle}`).not.toInclude(needle);
      }
    }
  });
});
