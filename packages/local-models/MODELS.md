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
| Qwythos-9B (Claude-Mythos-5-1M) | vllm / sglang / llama.cpp | Qwen3.5-9B full-FT, 1M ctx (YaRN ×4), native fn-calling; uncensored. **Unverified on our HW.** See note below |

Honest ceiling: fine for triage, boilerplate, and single-file edits; expect
plan-loops on multi-step agent work.

### Qwythos-9B — Claude-Mythos-5-1M (candidate, not yet banked)

`empero-ai/Qwythos-9B-Claude-Mythos-5-1M` @ rev `763f72fc2c3b` (apache-2.0,
un-gated, ~14 GB `model.safetensors`). Full-parameter fine-tune of Qwen3.5-9B on
Claude Mythos/Fable traces (publisher's claim), pitched at uncensored
cyber/biomed agentic use with a **1M-token** window (YaRN ×4 baked into
`config.json`, native fn-calling per Qwen3.5 spec).

Why it's here but flagged, not endorsed:

- **Publisher claims, not our numbers.** The headline "+34 MMLU" leans on a base
  Qwen3.5-9B scoring 0.232 MMLU — *below* 4-choice random (0.25), i.e. a broken
  base eval that inflates the delta. Treat the eval table as marketing until we
  re-run it. Tool-use demo (7/7) is plausible but self-reported.
- **1M ctx is config, not validated** — card says smoke-tested to ~137k, not 1M.
- **Uncensored + third-party "Claude" branding** — the name is Empero's, not an
  Anthropic product. Fine as an open weight; just don't confuse lineage.

Serve (once banked): `vllm serve empero-ai/Qwythos-9B-Claude-Mythos-5-1M
--max-model-len 1010000`. To bank + mirror, pin this exact revision and add a
verified row to the banked table after a real pi harness run.

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

### Frontier reference (cloud, not local — the bar to beat)

Not bankable here (proprietary / cloud-only), kept as the honest ceiling the
local tiers are measured against. When a T3/T4 open-weight row lands near these,
it earns the cloud-burst default. Snapshot 2026-07 (**bold** = row winner,
_underline_ = runner-up).

**Provenance (important):** this table is a **Sakana AI marketing chart** from
the Fugu launch (June 2026) — vendor-reported, and it omits Claude Mythos 5
(80.3) and Fable 5 (80.0), which actually top SWE-bench Pro. Fugu Ultra is a
*router over a model pool*, not a single LLM, and its numbers were not reproduced
by neutral testers. Opus 4.8 (69.2) and GPT-5.5 (58.6) corroborate against
independent trackers (BenchLM.ai, Artificial Analysis); the "Gemini 3.1" column
is disputed (independent boards list Gemini 3.5 Flash, not 3.1). See the
per-model provenance badges at **bench.unsigned.gg/frontier**.

| Benchmark | Fugu-Ultra | Fugu | Opus 4.8 | Gemini 3.1 | GPT-5.5 |
|---|--:|--:|--:|--:|--:|
| SWE Bench Pro | **73.7** | 59.0 | _69.2_ | 54.2 | 58.6 |
| Terminal Bench 2.1 | **82.1** | _80.2_ | 74.6 | 70.3 | 78.2 |
| LiveCodeBench | **93.2** | _92.9_ | 87.8 | 88.5 | 85.3 |
| LiveCodeBench Pro | **90.8** | 87.8 | 84.8 | 82.9 | _88.4_ |
| Humanity's Last Exam | **50.0** | 47.2 | _49.8_ | 44.4 | 41.4 |
| CharXiv Reasoning | **86.6** | _85.1_ | 84.2 | 83.3 | 84.1 |
| GPQA Diamond | **95.5** | **95.5** | 92.0 | _94.3_ | 93.6 |
| SciCode | 58.7 | **60.1** | 53.5 | _58.9_ | 56.1 |
| τ³ Banking | _20.6_ | **21.7** | _20.6_ | 8.4 | _20.6_ |
| Long Context Reasoning | 73.3 | **74.7** | 67.7 | 72.7 | _74.3_ |
| MRCRv2 | _93.6_ | 86.6 | 87.9 | 84.9 | **94.8** |
| CTI-REALM | _69.4_ | 67.5 | **69.6** | 56.0 | 67.3 |

Read: in Sakana's framing Fugu-Ultra sweeps (7 wins) and the two Fugu variants
lead 11 of 12 rows — but that's the maker grading its own homework with the two
models that beat it left off the chart. On the independently-tracked SWE-bench
Pro board the order is Mythos 5 (80.3) > Fable 5 (80.0) > Fugu Ultra (73.7) >
Opus 4.8 (69.2) > GPT-5.5 (58.6). Treat vendor rows as self-reported until
reproduced.

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

| Model | tok/s | Agentic (verified) | Notes |
|---|---|---|---|
| Qwen3.6-35B-A3B-MTP | 99 (58 plain) | ⚠️ tool-calls ✓; harness run blocked by pi client timeout on cold load — pre-warm first | T2 flagship; MTP +70%; needs load-timeout bump |
| Qwen3.6-27B-MTP (`qwen3.6-27b-mtp`) | ~110 (68 plain) | ✅ full pi run: write files → run test → pass | dense T1 daily driver; MTP +60% |
| GLM-4.7-Flash | 217 | ❌ emits clean calls but **corrupts tool results** (hallucinated file content 2/2 via ollama /v1) — do not use agentically as served; retry via llama.cpp `--jinja` | fastest banked |
| Devstral Small 2 24B | 86 | ⚠️ tool-calls ✓; harness run untested (same cold-load timeout) | agent-tuned; no MTP |
| Qwen3.5-9B-MTP (`qwen3.5-9b-mtp`) | 174 | ✅ full pi run passes (16s warm) | T0 utility/triage |
| Gemma 4 E4B (`gemma4:latest`, pre-existing) | 209 | ✅ full pi run passes (20s) — fastest task completion | not in HF mirror; engine-upgrade beneficiary |

Agentic verification 2026-07-04: wire-level = structured tool call + correct
args + uses tool result (`/v1/chat/completions`); harness-level = pi 0.80.3
multi-step task (write fizzbuzz + test, execute, pass). Cold loads exceed pi's
request timeout on 20GB+ models — warm the model (one dummy generate) before
harness use.

## Serving stack rules of thumb

- **ollama** (`serve/serve-ollama.sh`) — zero-friction start; fine for T0/T1
  single-user. The script serves at 64k context (ollama's own default is
  32k — modern agent harnesses overflow that before the first user word;
  omp's default footprint alone measured ~39k tokens, see
  `harness-omp/README`).
- **llama.cpp** (`serve/serve-llamacpp.sh`) — full control, GGUF quants,
  `--jinja` for native tool calls.
- **vLLM** (`serve/serve-vllm.sh`) — production path: throughput, concurrent
  harness sessions, `--enable-auto-tool-choice`.
- Context ≥32k always (agent sessions overflow chat defaults); 64k for
  full-harness omp **on ≥32GB hardware only** — KV cache at 64k puts the 27B
  at 30.1GB total, past any 24GB card (see the verification table below
  before assuming your tier fits). Quant floor ~Q4 — tool-call reliability
  degrades below it before chat quality does
  (see `packages/skills/local-model-triage`).

### 64k-context verification (RTX 5090 32GB, 2026-07-07, ollama 0.31.1)

Served via `serve-ollama.sh 65536` (`OLLAMA_CONTEXT_LENGTH`; no banked
Modelfile pins `num_ctx`, deliberately, so the env knob governs them all):

| Model | VRAM @ 64k | Verified |
|---|---|---|
| qwen3.6-27b-mtp | 30.1 / 32.6 GB (18 GB weights + KV) | ✅ full-harness omp (default ~39k-token config) → completes |
| qwen3.5-9b-mtp | 17.3 GB | ✅ completion round-trip |
| qwen3.6-35b-mtp | not measured | 32k assumed — verify before bumping its preset contextWindow |

Sources for the July-2026 rankings: [LiveBench/AA indices via huggingface.co
open-LLM roundups](https://huggingface.co/blog/daya-shankar/open-source-llms),
[whatllm.org coding table](https://whatllm.org/best-llm-for-coding),
[pinggy self-hosted coding guide](https://pinggy.io/blog/best_open_source_self_hosted_llms_for_coding/).
