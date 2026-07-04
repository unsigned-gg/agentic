<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: local-models/README.md (endpoint wiring)
-->

# harness-hermes

[hermes-agent](https://github.com/NousResearch/hermes-agent) (Nous Research)
at curated pin **`hermes-agent` 0.18.0** — the harness built by the lab whose
open-weight Hermes models it pairs naturally with.

```bash
./install.sh     # uv tool install at the pin + local-endpoint preset
hermes setup     # interactive wizard for provider auth (Portal/OpenRouter/etc.)
```

**Install-path note:** upstream's documented install is `curl … | bash`. That
is banned in this repo (never pipe remote scripts to a shell), so `install.sh`
uses `uv tool install hermes-agent[anthropic]==0.18.0` — the same PyPI package
the upstream script resolves to, without executing unreviewed remote code.

## What you get

- **`config/cli-config.local-endpoint.yaml`** → seeded to
  `~/.hermes/cli-config.yaml` if absent: points hermes at a local
  OpenAI-compatible endpoint (vLLM :8000 default; ollama/llama.cpp are a
  one-line `openai_base_url` change). **Config-key caveat:** validate keys
  against `hermes config list` on your installed version — upstream moves
  fast (0.18.0 "The Judgment Release" is 2026-07-01); the preset is
  test-gated only for YAML validity, localhost-only URLs, and secretlessness.
- Skills: hermes consumes agentskills.io skills and self-improves them
  ("procedural memory") — install the shared set via
  `packages/skills/install.sh`.
- Tools/MCP: 40+ built-in tools (`hermes tools` to configure); MCP servers
  attach via `hermes setup` / config.

## Cluster cousin

unsigned-paas runs this same upstream (pinned 0.16.0) as a kagent BYO agent
with an A2A shim (`unsigned-paas/applications/hermes-agent*`). This package is
the *local/workstation* harness; bumping the cluster pin to 0.18.0 is tracked
in Linear, not done here.
