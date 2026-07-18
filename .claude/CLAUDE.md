# CLAUDE.md — agentic

Agent-harness monorepo: pi.dev + opencode + hermes-agent configs/extensions,
shared agentskills.io skills, local-model bootstrap. Terrarium-federated
(external node; standards from terrarium/CANON.md).

## Layout

- `packages/harness-{pi,opencode,hermes,omp}/` — per-harness install script,
  config presets, extensions/plugins, README. One package per harness, no
  cross-deps.
- `packages/skills/` — shared Agent Skills; `install.sh` symlinks into every
  harness's skills dir. Skills follow agentskills.io (SKILL.md frontmatter).
- `packages/local-models/` — `probe.sh` (hardware tier), `serve/` (llama.cpp /
  vLLM / ollama OpenAI-compatible configs), `MODELS.md` (tiered matrix).

## Hard rules

- **Never `curl | bash`** — installs are download-pin-verify or package-manager
  native (`npm i -g pkg@x.y.z`, `uv tool install pkg==x.y.z`).
- **Pin everything**: harness versions in install scripts, model files by exact
  HF revision in MODELS.md, actions by version in workflows.
- **Signed conventional commits**, PR-only to main, affected-CI green to merge.
- Configs are **presets, not live config** — nothing here contains API keys or
  tokens. Local endpoint URLs (localhost) only.
- Docs carry lineage HTML-comment blocks (terrarium convention).

## Build / test

`./scripts/bootstrap.sh` once, then `moon check --all`. Node packages: pnpm via
moon tag-node tasks; python: uv via tag-python. Shell: shellcheck (CI + lint).

## Upstream tracking

Harness pins are bumped deliberately (PR per bump, changelog reviewed) — this
repo's value is *curated known-good*, not latest. Current: pi-coding-agent
0.80.10 · opencode-ai 1.18.3 · hermes-agent 0.18.0 ·
@oh-my-pi/pi-coding-agent 16.3.12 (bun).
