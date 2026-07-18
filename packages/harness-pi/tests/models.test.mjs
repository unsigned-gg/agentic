// Preset gates for config/models.json: validity, secretlessness, endpoint
// allowlist, pin drift. Mirrors harness-omp/tests/preset.test.ts (bun) and
// harness-hermes/tests/test_presets.py (pytest).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(PKG, "config/models.json"), "utf8");
const install = readFileSync(join(PKG, "install.sh"), "utf8");
const readme = readFileSync(join(PKG, "README.md"), "utf8");

const SECRETY = ["sk-", "Bearer", "ghp_", "AKIA"];
const ALLOWLIST = [/^http:\/\/localhost[:/]/, /^http:\/\/127\.0\.0\.1[:/]/, /^https:\/\/llm\.unsigned\.gg\//];

test("models.json parses to a providers mapping", () => {
  const doc = JSON.parse(raw);
  assert.equal(typeof doc.providers, "object");
  assert.ok(Object.keys(doc.providers).length > 0);
});

test("baseUrls stay on the endpoint allowlist", () => {
  const { providers } = JSON.parse(raw);
  for (const [name, p] of Object.entries(providers)) {
    assert.ok(ALLOWLIST.some((re) => re.test(p.baseUrl)), `${name}: ${p.baseUrl}`);
  }
});

test("no secret-shaped strings", () => {
  for (const needle of SECRETY) assert.ok(!raw.includes(needle), needle);
});

test("apiKey values are env: refs or benign literals", () => {
  const { providers } = JSON.parse(raw);
  for (const [name, p] of Object.entries(providers)) {
    if (p.apiKey) assert.match(p.apiKey, /^env:[A-Z0-9_]+$|^[a-z]+$/, name);
  }
});

test("install.sh pin matches README", () => {
  const pin = install.match(/^PI_VERSION="(\d+\.\d+\.\d+)"$/m)?.[1];
  assert.ok(pin, "install.sh: no exact PI_VERSION pin");
  assert.ok(readme.includes(pin), "README pin drifted from install.sh");
});

test("@earendil-works/pi-coding-agent devDependency matches the harness pin", () => {
  // OPS-749: the 3-way gate opencode already has. Without it a
  // package.json-only bump (dependabot PR #37) silently diverges the
  // devDependency from the pin the install script actually ships.
  const pin = install.match(/^PI_VERSION="(\d+\.\d+\.\d+)"$/m)?.[1];
  const manifest = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
  assert.equal(manifest.devDependencies["@earendil-works/pi-coding-agent"], pin);
});
