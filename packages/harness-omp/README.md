<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: local-models/README.md (endpoint wiring), docs/eval/2026-07-06-shepherd-omp-adoption.md (adoption rationale)
-->

# harness-omp

[oh-my-pi](https://github.com/can1357/oh-my-pi) ([omp.sh](https://omp.sh)) at
curated pin **`@oh-my-pi/pi-coding-agent` 16.3.12**, binary `omp` — a hard
fork of pi with an aggressively expanded tool harness: hash-anchored edits,
LSP-wired writes, DAP debugging, first-class worktree-isolated subagents,
persistent Python/Bun eval kernels, and headless RPC/ACP modes.

```bash
./install.sh     # bun install -g at the pin + models.yml local-endpoint preset
omp              # interactive TUI; `omp -p "..."` for one-shot headless
```

**Install-path note:** upstream's documented install is a remote script piped
to a shell. That is banned in this repo, so `install.sh` uses
`bun install -g @oh-my-pi/pi-coding-agent@16.3.12` — the same npm package the
installer resolves to. omp is **Bun-native** (`engines.bun >= 1.3.14`); the
repo's `.prototools` pins bun 1.3.14 and `scripts/bootstrap.sh` provisions it.

## Relationship to harness-pi

omp is a hard fork of pi, **not** a config-compatible variant: it reads
`~/.omp/agent` (plus `.claude`/`.codex`/`.gemini` trees) but not `~/.pi`, its
extension model is Gemini-style (pi TS extensions do not carry over), and its
versioning is re-based (16.x vs pi 0.80.x). The two harnesses coexist; presets
are maintained separately.

## What you get

- **`config/models.yml`** → seeded to `~/.omp/agent/models.yml` if absent:
  the same endpoints as harness-pi's `models.json` (the `llm` unsigned model
  gateway at llm.unsigned.gg — Crusoe/OpenRouter/Anthropic/MorphLLM upstreams,
  key via `UNSIGNED_LLM_API_KEY`, 1P item `unsigned-llm` — plus ollama :11434,
  llama.cpp :8080, vLLM :8000) in omp's provider schema. **Rename note
  (2026-07-07):** the gateway provider was `neuralwatt`; presets are
  copy-if-absent, so an existing `~/.omp/agent/models.yml` keeps the old
  name — hand-merge the `llm` block (the old hostname keeps working through
  the deprecation window).
  `apiKey` values are env-var names (resolved env-first, then literal) — no
  secrets in the preset. **Schema caveat:** validated against the
  `models-config-schema.ts` shipped in v16.3.12; upstream releases multiple
  times a day, so re-check on bump. **Context caveat:** omp's default system
  prompt (32 tools + skills) measured ~39k tokens — it does not fit the 32k
  context the local presets serve. For local models either serve a larger
  context or slim the harness (`--no-tools --no-skills`); full-harness omp is
  realistically a gateway/frontier-model configuration.
- **Skills:** omp consumes agentskills.io skills natively from
  `~/.omp/agent/skills` — installed by `packages/skills/install.sh`
  (registered in its `TARGETS`).
- **Headless / supervision surface:** one-shot `omp -p`, `--mode json`,
  stdio `--mode rpc`, ACP (`omp acp`); sessions via `--session-dir` +
  `--continue`/`--resume`; autonomy via `--approval-mode`. Upstream's
  `python/robomp` is a reference external supervisor driving `omp --mode rpc`
  against per-issue worktrees.

## Local profile (context budget)

omp's default request footprint measured **~39k tokens before the first user
word** (v16.3.12, machine with a populated Claude Code ecosystem): ~19k tool
JSON schemas + ~15.8k auto-discovered skill descriptions (omp co-reads every
`.claude`/`.agents`/plugin skills dir — 157 skills here) + ~2.5k CLAUDE.md
ingestion + ~2k omp core prompt. That exceeds every 32k local model.

**`config/config.local.yml`** → seeded to `~/.omp/agent/config.yml` if absent:
hides non-essential tool schemas behind tool discovery
(`tools.discoveryMode: all` + a 6-tool essential set; verified 20 → 9
schemas), disables heavy subsystems (LSP, DAP, AST, kernels), and scopes
skill discovery to the shared set via the `skills.includeSkills` allowlist
(source toggles alone still admit plugin skills — verified 111 remained;
the allowlist is CI-synced against `packages/skills/`). Measured result:
**~12k real tokens** (13.2k by the probe's ~10%-high estimator), down from
~39k — fits 32k local contexts. Full-harness omp remains the right
configuration for gateway/frontier models (delete the file or flip
`tools.discoveryMode: auto`). Config format note: keys are NESTED YAML maps
(`tools: {discoveryMode}`), not dotted strings — dotted keys are silently
ignored, as are unknown keys (`generate_image` has no toggle and ships ~505
tokens regardless).

**`config/config.gateway-slim.yml`** — the measured middle ground (OPS-481,
docs/eval/2026-07-09-code-mode-vs-omp-discovery.md): full default tool harness
for gateway/frontier models, skills pinned to the shared allowlist. ~28.9k est
tokens vs ~47k ambient (-38%); the skills block is the profile's only
organically-growing cost (+1.7k/day observed from plugin sprawl). Regression
gate: `tools/measure-context.sh --budget 31000 --settings
config/config.gateway-slim.yml`.

**`tools/measure-context.sh`** measures the real footprint: it runs `omp -p`
against a localhost capture sink under a throwaway profile and prints the
system/tools/skills breakdown. Run it on every pin bump
(`--budget 14000 --settings config/config.local.yml` is the regression gate,
in estimator space); it needs omp installed, so it is not CI-gated.

## Pin-churn posture

Upstream cuts multiple releases per day. This repo's charter is curated
known-good, so the pin moves deliberately (PR per bump, changelog reviewed) —
expect the pin to trail latest by design. See the adoption eval in
`docs/eval/` for the full risk/benefit record.

## Verified

CI-gated: shellcheck on `install.sh`. Exercised live (2026-07-06, WSL2):

- `proto install` provisions bun 1.3.14 from the `.prototools` pin.
- `install.sh` → global install at 16.3.12, `omp --version` reports the pin,
  preset seeded to `~/.omp/agent/models.yml`. Bun blocked two dependency
  postinstalls (`onnxruntime-node`, `protobufjs`) under its default trust
  model — core CLI unaffected; `bun pm -g trust` them if omp's local-embedding
  memory features are wanted.
- Headless round-trip against the preset:
  `omp -p --model=ollama/qwen3.6-27b-mtp --no-session --no-tools --no-skills
  --no-extensions "Reply with exactly the word: ok"` → `ok`. Full-harness
  (default tools/skills) exceeds 32k local context — see the context caveat
  above.

- Full-harness gateway round-trip (2026-07-06, under the pre-rename
  `neuralwatt` provider key; today: `omp -p --model=llm/GLM-5.2`): the default
  39k harness wrote, executed, and self-verified a 193-line Python animation
  end-to-end through the gateway. Required the preset's
  `compat.supportsStore: false` (Crusoe 403s the OpenAI `store` param) and a
  one-time virtual-key seed on the gateway — now automated by the chart's
  PostSync seed Job (OPS-438).

Needs live exercise per-host: skills discovery after running
`packages/skills/install.sh`.
