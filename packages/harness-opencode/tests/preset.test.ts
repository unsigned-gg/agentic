// Preset gates for opencode.json: JSON validity, endpoint allowlist,
// secretlessness, pin drift. Mirrors harness-omp/tests/preset.test.ts
// (OPS-731 — bring opencode to the omp preset-test bar).
// Zero-dep: bun:test only.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PKG = join(import.meta.dir, "..");
const CONFIG_RAW = readFileSync(join(PKG, "config/opencode.json"), "utf8");
const INSTALL = readFileSync(join(PKG, "install.sh"), "utf8");
const README = readFileSync(join(PKG, "README.md"), "utf8");
const MANIFEST = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

// secret-shaped needles (mirrors harness-hermes tests/test_presets.py)
const SECRETY = ["sk-", "Bearer ", "ghp_", "AKIA"];
const ENDPOINT_ALLOWLIST = [
  /^http:\/\/localhost[:/]/,
  /^http:\/\/127\.0\.0\.1[:/]/,
  /^https:\/\/llm\.unsigned\.gg\//,
];

describe("opencode.json", () => {
  const doc = JSON.parse(CONFIG_RAW) as Record<string, any>;

  test("parses to a provider mapping", () => {
    expect(doc).toBeObject();
    expect(doc.provider).toBeObject();
    expect(Object.keys(doc.provider).length).toBeGreaterThan(0);
  });

  test("baseURLs stay on the endpoint allowlist", () => {
    for (const [name, p] of Object.entries<any>(doc.provider)) {
      const url = p.options?.baseURL;
      if (url === undefined) continue; // npm-resolved providers may omit it
      expect(ENDPOINT_ALLOWLIST.some((re) => re.test(url)), `${name}: ${url}`).toBeTrue();
    }
  });

  test("apiKey values are env templates or benign literals, never key material", () => {
    for (const [name, p] of Object.entries<any>(doc.provider)) {
      const key = p.options?.apiKey;
      if (key === undefined) continue;
      // opencode env interpolation ({env:VAR}) or a benign literal like "ollama"
      expect(key, name).toMatch(/^\{env:[A-Z0-9_]+\}$|^[a-z]+$/);
    }
  });

  test("every provider lists at least one model", () => {
    for (const [name, p] of Object.entries<any>(doc.provider)) {
      expect(Object.keys(p.models ?? {}).length, name).toBeGreaterThan(0);
    }
  });
});

describe("secretlessness", () => {
  for (const [label, content] of [
    ["config/opencode.json", CONFIG_RAW],
    ["install.sh", INSTALL],
  ] as const) {
    test(`${label} carries no secret-shaped strings`, () => {
      for (const needle of SECRETY) expect(content, needle).not.toInclude(needle);
    });
  }
});

describe("pin drift", () => {
  const installPin = INSTALL.match(/OPENCODE_VERSION="([^"]+)"/)?.[1];

  test("install.sh pins an exact version", () => {
    expect(installPin).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("README documents the same pin", () => {
    expect(README).toInclude(`\`opencode-ai\` ${installPin}`);
  });

  test("@opencode-ai/plugin devDependency matches the harness pin", () => {
    expect(MANIFEST.devDependencies["@opencode-ai/plugin"]).toBe(installPin);
  });
});
