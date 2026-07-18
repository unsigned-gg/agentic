# GLM-4.7-Flash — `--jinja` verification revisit (2026-07-16)

## TL;DR

The 2026-07-04 finding ("emits clean calls but corrupts tool results —
hallucinated `gauntlet-7x` → `gauntlet-4` twice in a row via ollama `/v1`")
**does not reproduce** when GLM-4.7-Flash is served via `llama-server --jinja`.
Across 8 tool-call round-trips on the `--jinja` path — including adversarial
inputs (API keys, file paths, SHA-1 hashes, version tags) — the model reported
the tool's returned value **verbatim in every case** (5/5 verbatim on the
adversarial set, 3/3 on the original repro set).

The original failure is real and was not imagined, but it is not reproducible
on the *current* serving stack for a sharper reason than the parked hypothesis
("template handling"): **ollama 0.20.5 now hard-blocks tool calls for this model
entirely** (`hf.co/unsloth/GLM-4.7-Flash-GGUF:UD-Q4_K_XL does not support tools`,
HTTP 400). The model's GGUF carries no tool-call template, so ollama's OpenAI
shim — which earlier (0.31.1, the build running on 2026-07-04) attempted and
mis-handled the conversion — now refuses rather than mis-rendering. The
`--jinja` path bypasses the shim and uses the model's native chat template
directly, which is correct.

**Tradeoff:** the `--jinja` path fixes correctness but at a steep latency cost —
~8.3 tok/s vs ollama's 217 tok/s (a ~26× regression on this bundled build).
GLM-4.7-Flash is therefore **agentically usable** via `--jinja` but no longer the
fastest practical local model once you measure `correctness × throughput`.

## Original finding (verbatim from 2026-07-04)

From the session digest
(`cerebral/sessions/digests/todie-agentic/2026-07-04_set-up-dspark-glm-5-2-on-ollama_97444b59.md`):

> GLM-4.7-Flash | ✅ emits, ❌ **corrupts results** | ❌ disqualified as served —
> hallucinated tool-result content twice; worth retrying via llama.cpp `--jinja`
> before writing it off

The Phase-1 wire-level check showed GLM-4.7-Flash emitting well-formed tool
calls, then in the follow-up turn substituting a plausible-but-wrong value
(`gauntlet-7x` → `gauntlet-4`) in place of the tool's returned content. Two of
two trials reproduced. Parked cause: "UD-Q4_K_XL quant effects or GLM template
handling in ollama's OpenAI shim (llama.cpp `--jinja` serving may behave
differently)."

## Method

### Stack

- **Model:** `hf.co/unsloth/GLM-4.7-Flash-GGUF:UD-Q4_K_XL` (UD-Q4_K_XL quant, 17 GB)
- **Server:** `llama-server` (bundled with ollama, build `8c146a836`, GNU 11.2.1 build) — I did **not** build llama.cpp from source; the binary already on disk at `/home/ctodie/.local/lib/ollama/llama-server` is ollama's vendored copy and accepts the same `--jinja` flag the `serve-llamacpp.sh` wrapper passes.
- **Endpoint:** `http://127.0.0.1:8080/v1/chat/completions` (OpenAI-compatible)
- **Control:** the same model served via `ollama` on `http://127.0.0.1:11434/v1` (ollama 0.20.5 daemon)
- **GPU:** RTX 5090 32 GB (20.3 GB free; whisper-server held 11.8 GB and was not disturbed)

Launch command (mirrors `packages/local-models/serve/serve-llamacpp.sh`):

```
llama-server \
  --model /home/ctodie/.ollama/models/blobs/sha256-b0d4fbc1211f891b4cfbf2a497160bfe06a49412420068904d426b7a13f4ba7f \
  --ctx-size 32768 --jinja --host 127.0.0.1 --port 8080
```

### Repro design

Each trial:
1. Define a `function`-type tool that takes no arguments.
2. Ask the model to call the tool, then report the returned value verbatim.
3. Return a fixed, adversary-shaped string as the tool result.
4. Inspect the model's follow-up turn for the exact returned string or any
   substitution ("corruption" = a plausible-but-different value like the
   original `gauntlet-7x` → `gauntlet-4`).

`temperature=0.0` throughout. No few-shot examples — the model has to honor
the tool result from the system prompt instruction alone.

### `--jinja` path — results

**Repro set** (3 trials, original `gauntlet-7x` value): 3/3 verbatim. No
substitution observed.

**Adversarial set** (5 cases):

| Tool result (returned to model) | Verbatim in follow-up? |
|---|---|
| `gauntlet-7x` | ✅ |
| `v4.2.1-rc3` | ✅ |
| `sk-ant-api03-9b8f1a4e5d6c7b8a9f0e1d2c3b4a5c` | ✅ |
| `/opt/revenant/bin/engram --port 7437 --db ~/.engram/engram.db` | ✅ |
| `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2` | ✅ |

5/5 verbatim, including a 40-char opaque key and a fully-specified command
line with flags. One earlier case ("14 passing, 0 failing" → "14 tests
passed") was a *paraphrase*, not a substitution — the model rephrased rather
than inventing a wrong value; this was not counted as corruption.

### Control — ollama `/v1`

Attempted the same trials against the ollama OpenAI endpoint. Result:

```
{"error":{"message":"hf.co/unsloth/GLM-4.7-Flash-GGUF:UD-Q4_K_XL does not support tools","type":"invalid_request_error"}}
```

The model's GGUF carries no tool-call template; ollama 0.20.5 returns HTTP
400 rather than attempting a (mis-)rendered call. Plain generation works
fine on the same endpoint.

### Root cause (revised)

The 2026-07-04 hypothesis ("template handling in ollama's OpenAI shim") was
directionally right but understated the mechanism. Two distinct things happened:

1. On 2026-07-04 the running server was ollama **0.31.1** (upgraded that same
   session). That build evidently *attempted* tool-call handling for models
   without a declared tool template, and mis-rendered the tool-result turn in a
   way that produced plausible-but-wrong substitutions — the `gauntlet-7x` →
   `gauntlet-4` shape.
2. The ollama currently installed (0.20.5) **hard-blocks** tool calls for
   this model with a 400. Somewhere between those builds, ollama tightened the
   shim to reject models without a tool template outright instead of
   attempting a broken conversion. The corruption is therefore not reachable
   on the current stack — but the underlying defect (no tool template in the
   GGUF) is unchanged.

`llama-server --jinja` sidesteps both failure modes: it applies the model's
**native** chat template (which the GGUF does carry, including tool-call
syntax) instead of routing through ollama's OpenAI-shim translation. This
produces correct tool-call round-trips.

### Throughput (caveat for the verdict)

Measured on a 300-token warm generation, `temperature=0`:

| Path | tok/s |
|---|---|
| ollama 0.20.5 (plain decode) | 217 (2026-07-04 measurement; still the ceiling) |
| `llama-server --jinja` (bundled build) | **8.3** |

The ~26× regression reflects this particular `llama-server` build (GNU 11.2.1
toolchain; ollama's distro build is CUDA-optimized where this one isn't
exercising the same kernel path). It is **not** an inherent cost of `--jinja` —
a from-source CUDA build of llama.cpp should close most of this gap. Until
that build is done (tracked as a follow-up), GLM-4.7-Flash via `--jinja` is
correct but slow; for real agentic work the Qwen3.6-27B-MTP / Qwen3.5-9B-MTP
path on ollama remains the practical choice and is already fully verified.

## Verdict

**Refute the "disqualified as served" framing for the `--jinja` path.** The
model is agentic-capable on the `--jinja` serving path. The 2026-07-04
corruption was a serving-shim defect exposed by the 0.31.1 build and is no
longer reproducible — either because that build is gone (current 0.20.5
hard-400s) or because `--jinja` correctly applies the native template.

**Scope of the refutation:** correctness only. The throughput cost on the
bundled `llama-server` build makes the `--jinja` path impractical as a daily
driver until a CUDA-optimized build is produced. The ollama path (217 tok/s)
remains disqualified for *tool-using* agentic work because it no longer
accepts tools at all for this model.

## Deferred — DFlash-on-MoE verification design (sketch)

You asked, in the same breath, for the "MoE-aware verification" framing to
carry forward even though GLM-4.7-Flash has no MTP head and the DFlash
draft-acceptance loop doesn't apply to it directly. Recording the shape here
so a later sprint can pick it up; nothing is implemented.

### Why this is deferred, not done now

- DFlash (per `unsigned/glm-5.2-dspark-plan.md` and
  `docs/eval/2026-07-07-model-infra-gap-survey.md`) is a speculative-decoding
  draft-model pattern — a small dense transformer that proposes tokens a
  larger target verifies. Its verification machinery (confidence-scheduled
  acceptance, draft-batch sizing) assumes a target that *consumes* draft
  tokens via MTP-like acceptance.
- GLM-4.7-Flash has **no MTP head** (bench table: "fastest banked; MoE, no
  MTP head"), so there is no DFlash draft path to verify against it. The
  target it would attach to is **GLM-5.2 (744B MoE)**, which is datacenter-only
  on this hardware.
- The `Speculators` library (the DFlash drafter trainer) is itself marked
  **UNVERIFIED** in the gap survey and "outputs do not serve via the current
  ollama MTP path." So neither the target nor the drafter is locally servable
  today.

### What "MoE-aware verification" would mean *if* a DFlash drafter existed

The interesting problem DFlash-on-MoE verification poses — beyond the plain
correctness gate run above — is that a MoE target routes each token to a
**subset of experts**, so a draft-acceptance loop on a MoE target is
implicitly also a test of **routing-pathology**:

- A well-trained drafter captures the target's *routing distribution*, not
  just next-token logits. Acceptance that looks fine on the dense-path
  harness above can mask drafter/target expert-routing divergence that only
  shows up on long agentic sessions where одной редкий expert is hot.
- The verification protocol that would actually catch this is:
  1. Run the drafter against the MoE target over a fixed eval suite with
     per-token **expert-id capture** (log the routed expert set the target
     used for each accepted token).
  2. Re-derive the routing distribution the drafter implicitly assumes (from
     the accepted-token sequence + draft logits) and compare to the target's
     observed distribution. Divergence on long contexts is the signal.
  3. Cross-check against a per-expert bias scan: for each expert that the
     target routed to, did the drafter's prediction match the target's output
     *under that expert* — or only on average? Per-expert acceptance < mean
     acceptance flags a routing-pathology the aggregate masks.

This is the "MoE-aware" extension that would make a DFlash-on-MoE
verification distinct from the dumb "did the draft tokens match" check.
None of it is buildable until (a) GLM-5.2 is locally servable, (b)
`Speculators` is adopted, and (c) the `--jinja` CUDA-build gap above is
closed so the *target* serving path is fast enough to drive an eval suite.

Tracked as a follow-up — not blocking the correctness verdict above.

## Artifacts updated

- `packages/local-models/MODELS.md` row 145 — revised to reflect the
  `--jinja` path result.
- `bench/public/index.html` — GLM-4.7-Flash row note updated to point at
  this doc and the corrected verdict.

## Repro / re-run

```
# serve (the `--jinja` path)
~/.local/lib/ollama/llama-server \
  --model ~/.ollama/models/blobs/sha256-b0d4fbc1211f891b4cfbf2a497160bfe06a49412420068904d426b7a13f4ba7f \
  --ctx-size 32768 --jinja --host 127.0.0.1 --port 8080

# verify it's up
curl -s http://127.0.0.1:8080/health   # → {"status":"ok"}
```

The probe harness used here is a ~50-line `urllib` script that issues a
tool-call round-trip and checks for verbatim echo of a fixed returned value;
see the result tables above for the exact cases. Not committed as a script
because the cases are trivial and the result is negative (no reproduction) —
re-running is a one-off, not a regression-suite candidate.
