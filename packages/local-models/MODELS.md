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

## Speculative decoding (verified 2026-07-04, RTX 5090 / ollama 0.31.1)

Ollama's CUDA runner supports **draft-mtp only** — embedded-MTP GGUFs via
`PARAMETER draft_num_predict`. Classic small-LM `DRAFT` pairings are rejected
(`context type MTP requested but model doesn't contain MTP layers`), and the
Gemma-4 `gemma4_assistant` drafter arch isn't in ollama's vendored engine yet
(upstream llama.cpp has it — use `serve/serve-llamacpp.sh` for that pairing).

Known-good recipe (68 → ~110 tok/s, +60%, acceptance ~0.55 / mean len 3.0):

```
FROM hf.co/unsloth/Qwen3.6-27B-MTP-GGUF:UD-Q4_K_XL   # rev 5cb35eb3dcbf
PARAMETER draft_num_predict 4
```

Per-position acceptance decays fast (0.77/0.56/0.39/0.28) — try
`draft_num_predict 2-3` if verification overhead shows at higher batch.
MoE MTP (35B-A3B nextn) **works** on 0.31.1 (ollama#16282 no longer bites)
but post-tensor init exceeds the default 5m load watchdog — serve with
`OLLAMA_LOAD_TIMEOUT=15m`.

## Banked models (verified on RTX 5090 32GB, 2026-07-04)

Local bank in `~/.ollama`; private mirror **hf.co/todie/model-bank** holds the
exact GGUFs + sha256s (canonical identity — upstream repos can mutate).
All UD-Q4_K_XL dynamic quants from unsloth, pulled via `hf.co/` refs.

| Model | tok/s | Notes |
|---|---|---|
| Qwen3.6-35B-A3B-MTP | 99 (58 plain) | T2 flagship; MTP +70%; needs load-timeout bump |
| Qwen3.6-27B-MTP (`qwen3.6-27b-mtp`) | ~110 (68 plain) | dense T1 daily driver; MTP +60% |
| GLM-4.7-Flash | 217 | fastest banked; agentic GLM small |
| Devstral Small 2 24B | 86 | agent-tuned, best tool discipline; no MTP |
| Qwen3.5-9B-MTP (`qwen3.5-9b-mtp`) | 174 | T0 utility/triage |

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
