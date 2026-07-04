---
name: local-model-triage
description: Use when a locally-served model misbehaves in an agent harness — wrong/empty tool calls, truncated output, context overflow, or slow generation. Diagnoses whether the fault is the model tier, the serving config, or the harness wiring, using the agentic repo's probe and model matrix.
---

# Local model triage

A local model "acting dumb" in a harness has exactly three fault domains.
Check them in this order — cheapest first.

## 1. Serving config (most common)

- **Context window**: serving defaults are often 4-8k; agent harnesses need
  32k+. llama.cpp: `--ctx-size`; vLLM: `--max-model-len`; ollama: `num_ctx`
  in the Modelfile or request. Symptom: the agent forgets earlier turns or
  tool schemas mid-session.
- **Tool-call parsing**: agentic use requires the server's native tool-call
  template. llama.cpp: `--jinja`; vLLM: `--enable-auto-tool-choice
  --tool-call-parser <family>`. Symptom: tool calls arrive as prose JSON in
  the text channel instead of structured calls.
- **Quantization too aggressive**: below ~Q4, tool-call reliability degrades
  before chat quality does. Symptom: schema-ish but malformed arguments.

## 2. Model tier

Run `packages/local-models/probe.sh`; compare the served model against
`packages/local-models/MODELS.md` for the hardware tier. A model below the
matrix's "agentic-capable" line will loop, ignore system prompts, or
hallucinate tool names — no serving flag fixes that; move up a tier or to a
coder/agentic variant.

## 3. Harness wiring

- Endpoint alive? `curl -s http://localhost:<port>/v1/models`
- Model id in the harness config must EXACTLY match the served id (`pi`:
  `~/.pi/agent/models.json`; opencode: provider `models` key; hermes:
  `model:` in `~/.hermes/cli-config.yaml`).
- Streaming quirks: if output truncates only in one harness, test the same
  prompt via curl; if curl is fine, the fault is that harness's provider
  config, not the model.

Report findings as: fault domain → evidence → one-line fix.
