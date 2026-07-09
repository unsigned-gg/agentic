// Preset gates: YAML validity, secretlessness, endpoint allowlist, pin drift.
// Zero-dep: Bun.YAML (bun >= 1.3) + bun:test.
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PKG = join(import.meta.dir, "..");
const MODELS = readFileSync(join(PKG, "config/models.yml"), "utf8");
const SETTINGS = readFileSync(join(PKG, "config/config.local.yml"), "utf8");
const INSTALL = readFileSync(join(PKG, "install.sh"), "utf8");
const README = readFileSync(join(PKG, "README.md"), "utf8");

// secret-shaped needles (mirrors harness-hermes tests/test_presets.py)
const SECRETY = ["sk-", "Bearer", "ghp_", "AKIA"];
const ENDPOINT_ALLOWLIST = [/^http:\/\/localhost[:/]/, /^http:\/\/127\.0\.0\.1[:/]/, /^https:\/\/llm\.unsigned\.gg\//];

// BUILTIN_TOOL_NAMES from oh-my-pi v16.3.12
// packages/coding-agent/src/tools/builtin-names.ts — re-check on pin bump.
const BUILTIN_TOOLS = [
  "read", "bash", "edit", "ast_grep", "ast_edit", "ask", "debug", "eval",
  "ssh", "github", "glob", "grep", "lsp", "inspect_image", "browser",
  "checkpoint", "rewind", "task", "job", "irc", "todo", "web_search",
  "search_tool_bm25", "write", "memory_edit", "retain", "recall", "reflect",
  "learn", "manage_skill",
];

describe("models.yml", () => {
  const doc = Bun.YAML.parse(MODELS) as Record<string, any>;

  test("parses to a providers mapping", () => {
    expect(doc).toBeObject();
    expect(doc.providers).toBeObject();
    expect(Object.keys(doc.providers).length).toBeGreaterThan(0);
  });

  test("baseUrls stay on the endpoint allowlist", () => {
    for (const [name, p] of Object.entries<any>(doc.providers)) {
      expect(ENDPOINT_ALLOWLIST.some((re) => re.test(p.baseUrl)), `${name}: ${p.baseUrl}`).toBeTrue();
    }
  });

  test("apiKey values are env-var names or benign literals, never key material", () => {
    for (const [name, p] of Object.entries<any>(doc.providers)) {
      if (p.apiKey) expect(p.apiKey, name).toMatch(/^[A-Z0-9_]+$|^[a-z]+$/);
    }
  });
});

describe("config.local.yml", () => {
  const doc = Bun.YAML.parse(SETTINGS) as Record<string, any>;

  test("parses to a mapping", () => {
    expect(doc).toBeObject();
  });

  test("essentialOverride only names real builtin tools", () => {
    const essentials = doc.tools?.essentialOverride as string[];
    expect(essentials).toBeArray();
    for (const t of essentials) expect(BUILTIN_TOOLS, t).toContain(t);
  });

  test("discovery mode set to the slimming value", () => {
    expect(doc.tools?.discoveryMode).toBe("all");
  });

  test("includeSkills allowlist stays in sync with packages/skills", () => {
    const skillsDir = join(PKG, "../skills");
    const shared = readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(skillsDir, e.name, "SKILL.md")))
      .map((e) => e.name)
      .sort();
    const allowlist = ([...(doc.skills?.includeSkills ?? [])] as string[]).sort();
    expect(allowlist).toEqual(shared);
  });

  test("modelRoles point at models declared in models.yml", () => {
    const models = Bun.YAML.parse(MODELS) as Record<string, any>;
    const declared = new Set<string>();
    for (const [prov, p] of Object.entries<any>(models.providers)) {
      for (const m of p.models ?? []) declared.add(`${prov}/${m.id}`);
    }
    for (const [role, id] of Object.entries<string>(doc.modelRoles ?? {})) {
      expect(declared.has(id), `${role}: ${id}`).toBeTrue();
    }
  });
});

describe("secretlessness", () => {
  test.each([
    ["models.yml", MODELS],
    ["config.local.yml", SETTINGS],
  ])("%s carries no secret-shaped strings", (_name, text) => {
    for (const needle of SECRETY) expect(text).not.toInclude(needle);
  });
});

describe("pin drift", () => {
  const pin = INSTALL.match(/^OMP_VERSION="(\d+\.\d+\.\d+)"$/m)?.[1];

  test("install.sh pins an exact version", () => {
    expect(pin).toBeString();
  });

  test("README documents the same pin", () => {
    expect(README).toInclude(pin!);
  });
});
