<!-- lineage
role: reference
conforms_to: ../../README.md
consumes: probe.sh tiers, serve/ configs
-->

# MODELS — local models worth using (July 2026)

Tiered by `probe.sh` output. "Worth using" here means **agentic-capable**:
reliable native tool calls, instruction following across long sessions, and
recovery when the first plan fails — not just chat quality. Below T0, use a
cloud model honestly rather than fighting a lobotomized local one.

Refresh cadence: matrix reviewed at harness pin bumps (tracked in Linear).
Pin models by **exact HF revision** when you download — model repos mutate.

## T0-small (10–20 GiB VRAM)

| Model | Serve | Notes |
|---|---|---|
| Gemma 4 26B-A4B (quant Q4) | ollama / llama.cpp | MoE, small active params — best chat-per-GiB; adequate tools |
| Qwen coder small variants | ollama | pick the largest that fits; coder tuning beats size at this tier |

Honest ceiling: fine for triage, boilerplate, and single-file edits; expect
plan-loops on multi-step agent work.

## T1-single (20–30 GiB — one 24 GB GPU)

| Model | Serve | Notes |
|---|---|---|
| **Devstral Small 2 (24B)** | vllm (`--tool-call-parser mistral`) / llama.cpp Q5 | agent-tuned specifically; the default pick |
| Qwen 3.6 27B | vllm (`qwen` parser) / ollama | stronger general coding, slightly weaker tool discipline |
| Gemma 4 26B-A4B (Q6+) | llama.cpp | the chat-quality pick |

## T2-moe (30–40 GiB)

| Model | Serve | Notes |
|---|---|---|
| **Qwen3.6-35B-A3B** | vllm | MoE — near-frontier agentic at workstation VRAM; the tier's reason to exist |

## T3-multi / T4-server (40 GiB+ / 70 GiB+, multi-GPU or cloud burst)

| Model | Serve | Notes |
|---|---|---|
| **GLM-5.2** | vllm / sglang | open-weight SOTA: LiveBench 79.65 coding / 73.33 agentic (beats proprietary rows) |
| Kimi K2.6 | vllm | frontier-class alternative |
| DeepSeek V4 Pro | sglang | strongest at scale; heaviest to host |

This tier is where the unsigned-paas GPU substrate (OPS-344 node sources)
eventually serves the fleet — same OpenAI-compatible contract, so every
harness preset in this repo works unchanged against a cluster endpoint.

## Serving stack rules of thumb

- **ollama** — zero-friction start; fine for T0/T1 single-user.
- **llama.cpp** (`serve/serve-llamacpp.sh`) — full control, GGUF quants,
  `--jinja` for native tool calls.
- **vLLM** (`serve/serve-vllm.sh`) — production path: throughput, concurrent
  harness sessions, `--enable-auto-tool-choice`.
- Context ≥32k always (agent sessions overflow chat defaults); quant floor
  ~Q4 — tool-call reliability degrades below it before chat quality does
  (see `packages/skills/local-model-triage`).

Sources for the July-2026 rankings: [LiveBench/AA indices via huggingface.co
open-LLM roundups](https://huggingface.co/blog/daya-shankar/open-source-llms),
[whatllm.org coding table](https://whatllm.org/best-llm-for-coding),
[pinggy self-hosted coding guide](https://pinggy.io/blog/best_open_source_self_hosted_llms_for_coding/).
