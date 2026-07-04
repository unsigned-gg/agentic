<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: local-models/README.md (endpoint wiring)
-->

# harness-opencode

[opencode](https://opencode.ai) at curated pin **`opencode-ai` 1.17.13**.

```bash
./install.sh   # npm install -g at the pin, config preset + plugins symlinked
```

## What you get

- **`config/opencode.json`** → `~/.config/opencode/opencode.json` (only if
  absent — live config never clobbered): three local providers via
  `@ai-sdk/openai-compatible` — `ollama`, `llamacpp`, `vllm` — matching the
  same ports as the pi and hermes presets. opencode merges configs, so
  project-level `opencode.json` can still override.
- **`plugins/local-endpoint-status.ts`** → symlinked into
  `~/.config/opencode/plugins/`: on session start, probes the three endpoints
  and toasts which are live.
- Skills: opencode reads agentskills.io skills — install the shared set via
  `packages/skills/install.sh` (it targets opencode's skills dir too).

## Model selection

Inside opencode: `/models` → pick `Ollama (local)` / `llama.cpp server` /
`vLLM`. Model ids in the preset are placeholders aligned with
`packages/local-models/MODELS.md` — rename to match what you serve.

## Verified

- `tsc --noEmit` against the pinned `@opencode-ai/plugin` types — CI-gated.
- The provider block shape (`npm: @ai-sdk/openai-compatible`, `options.baseURL`)
  follows opencode's documented custom-provider pattern; validate live with
  `opencode` → `/models` after install.
