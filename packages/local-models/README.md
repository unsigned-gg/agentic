<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: MODELS.md, serve/*, harness-*/README.md
-->

# local-models

Getting a **local model worth using** behind every harness in this repo.

```bash
./probe.sh                                   # hardware → tier
# read MODELS.md § your tier, pick a model, then ONE of:
ollama pull <model>                          # zero-friction
serve/serve-llamacpp.sh model.gguf           # GGUF, full control, :8080
serve/serve-vllm.sh <hf-id> <parser>         # production path, :8000
```

## The contract

Everything serves **OpenAI-compatible** on fixed local ports — ollama
`:11434`, llama.cpp `:8080`, vLLM `:8000` — and every harness preset in this
repo already points at all three:

| Harness | Where the endpoint is wired |
|---|---|
| pi | `~/.pi/agent/models.json` (providers `ollama`/`llamacpp`/`vllm`) + `/local` command |
| opencode | `~/.config/opencode/opencode.json` provider block |
| hermes | `openai_base_url` in `~/.hermes/cli-config.yaml` |

Serve a model, set the id in the harness config to match the served id
exactly, done. Misbehaving? `packages/skills/local-model-triage` is the
diagnosis path (serving config vs model tier vs harness wiring).

## Agent-readiness flags (why these scripts exist)

Chat-default serving breaks agents. The scripts bake in the two invariants:
**context ≥32k** and **native tool-call templating** (`--jinja` for llama.cpp,
`--enable-auto-tool-choice --tool-call-parser <family>` for vLLM). ollama
users: set `num_ctx` ≥32768 in a Modelfile — its default will silently
truncate agent sessions.
