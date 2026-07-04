<!-- lineage
role: readme
conforms_to: terrarium/CANON.md (federated)
consumes: REGISTRY (terrarium), packages/*/README.md
-->

# agentic

Best-in-class **agent-harness configs, plugins, extensions, and local-model
bootstrap** — one terrarium-federated monorepo for making terminal agents and
the local models behind them *worth using*.

Three harnesses, one skills standard, one endpoint pattern:

| Package | What | Pinned |
|---|---|---|
| [`packages/harness-pi`](packages/harness-pi/) | [pi.dev](https://pi.dev) (`badlogic/pi-mono`) — config, `models.json` local-endpoint presets, TS extensions | `@earendil-works/pi-coding-agent` 0.80.3 |
| [`packages/harness-opencode`](packages/harness-opencode/) | [opencode](https://opencode.ai) — `opencode.json` presets, plugins, agents | `opencode-ai` 1.17.13 |
| [`packages/harness-hermes`](packages/harness-hermes/) | [hermes-agent](https://github.com/NousResearch/hermes-agent) (Nous Research) — `cli-config.yaml` presets, tools/MCP wiring | `hermes-agent` 0.18.0 |
| [`packages/skills`](packages/skills/) | **Shared** [agentskills.io](https://agentskills.io) skills — written once, installed into all three harnesses (+ Claude Code) | — |
| [`packages/local-models`](packages/local-models/) | Hardware probe → tiered model matrix → serving configs (llama.cpp / vLLM / ollama, OpenAI-compatible) | see `MODELS.md` |

**The convergence this repo exploits:** all three harnesses consume the same
Agent Skills standard, and all three speak to local models through
OpenAI-compatible endpoints. Skills are authored once; a served model is wired
into every harness with a config preset, not an integration.

## Quickstart

```bash
./scripts/bootstrap.sh          # proto toolchains + moon setup + lefthook
packages/local-models/probe.sh  # what can this machine run?
# then follow the README of the harness you want
```

## Standards

Terrarium-federated node (external; registered in terrarium `docs/REGISTRY.md`).
moon 2.2.6 workspace, proto-pinned toolchains, conventional signed commits,
release-please, affected-only CI + gitleaks. Install scripts never pipe remote
shells (`curl | bash` is banned here — download, pin, verify).
