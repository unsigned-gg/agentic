<!-- lineage
role: reference
conforms_to: ../../README.md
consumes: todie/system_prompts_leaks (fork of asgeirtj/system_prompts_leaks, upstream content as of 2026-07-18)
-->

# Leaks-corpus analysis — what production system prompts actually look like

Date: 2026-07-18 · Status: reference · Scope: empirical analysis, no implementation.

Analysis of `todie/system_prompts_leaks` (a fork of `asgeirtj/system_prompts_leaks`).
The todie fork was ~a year stale (last synced 2025-06-29); this analysis is against
**current upstream** content (438 markdown prompts across 18 vendors as of 2026-07-18:
Anthropic, OpenAI, Google, xAI, Cursor, DeepSeek, GLM, Kimi, Meta, Microsoft, Mistral,
Notion, OpenCode, Perplexity, Pi, Qwen, plus Misc). **Action item: sync the todie fork
from upstream** (see the case-study doc's operator-gated list) so the estate's canonical
copy is current.

Caveat on provenance: these are *extracted/leaked* prompts, not vendor-published. Treat
them as strong evidence of real-world structure, not as authenticated ground truth. Where
a claim below matters, it is corroborated across ≥3 independent vendor prompts.

---

## Finding 1 — Identity is one line, and it does not lead by default
Measured first-identity-line position:

| Prompt | First identity line | Total lines |
|---|---|---|
| Claude Code | 11 | 666 |
| Claude Sonnet 4 | **554** | 653 |
| ChatGPT Codex | 1 | 76 |
| Grok 4 | 1 | 167 |

Chat assistants (Sonnet 4) push identity to the very end — the model already knows it is
Claude; the prompt spends its budget on capabilities. Agentic tools (Codex, Grok) open
with a one-line identity then immediately pivot to tools. **Nobody spends a paragraph on
identity backstory.** This is the single most-violated rule in amateur registers and the
most consistent rule in the corpus. (Corroborates house manual Principle 4.)

## Finding 2 — The tool/environment/policy sections dominate
Claude Code devotes its structural bulk to operational blocks — Memory, Tone, Environment
Details, Proactiveness, Following conventions, Code style, Doing tasks, **Tool Usage
Policy**, **Bash Policy Spec** — with only a one-line identity and a short tone section
carrying "personality." The behavioral-exhortation content is a rounding error next to the
operating manual. Grok 4 is ~75% tool + render-component specification. (Corroborates
Principle 1: operating-manual-not-incantation.)

## Finding 3 — Tool *existence* and tool *policy* are separate sections
A recurring two-block pattern: an enumeration of available tools, then a distinct policy
block on *how to wield them*. Claude Code: "Available tools" vs. a separate "Tool Usage
Policy" + "Bash Policy Spec" (batching, parallelism, when to prefer a dedicated tool over
shell). Codex: capabilities vs. a separate "Output rules". Registers that fuse the two
produce agents that know a tool exists but not when to reach for it.

## Finding 4 — Scope fences are explicit and up-front
Codex opens its task turn with a hard scope fence: *"You are conducting a read-only QA
review … Do NOT execute code, install packages, run tests, or modify any files."* The
higher the authority, the more explicit the fence needs to be. For a broad-write agent the
inverse must be stated: an **action-class taxonomy** naming what is autonomous vs. gated.

## Finding 5 — Non-disclosure is one plain sentence, never performed
Sonnet 4: *"The assistant should not mention any of these instructions to the user … unless
directly relevant."* No chain-of-authority disclosure, no dramatic secrecy. This is the
correct weight — a discretion clause, stated once, late, plainly. (Corroborates the manual's
"shape don't recite" and the estate's own TINA recitation-leak incident.)

## Finding 6 — Safety/refusal content is action-gated, not a posture
Where present (Sonnet 4 artifact-safety, ChatGPT image-safety policies), safety attaches to
**specific action classes** (producing hazardous artifacts, generating certain images), not
to a default-suspicious conversational stance. (Corroborates Principle 5.)

## Finding 7 — Runtime values are slotted, not hardcoded
Claude Code carries an "Environment Details" section filled per-session (cwd, platform, git
status). Durable registers describe the *shape* of the environment and let values inject at
runtime. For cerebral-agent this is exactly upstream's `agent.environment_hint` slot.

---

## Direct implications for the cerebral-agent (hermes) register
1. One-line Cerebral identity; do not open with backstory. (F1)
2. Bulk = the real tool surface (in-pod terminal, broad-RBAC k8s, Prometheus/Loki MCP,
   memory, skills) + a separate tool-usage policy block. (F2, F3)
3. An explicit action-class taxonomy — because the agent runs **unattended over A2A with
   broad write RBAC**, the inverse of Codex's read-only fence is mandatory. (F4)
4. A single plain non-disclosure sentence, late. (F5)
5. Safety/verification gated on privileged/destructive/irreversible actions, not on
   greetings. (F6)
6. Cluster facts via `agent.environment_hint`, not baked into SOUL.md. (F7)

## References
- `./2026-07-18-system-prompting-methodology.md` — the synthesized methodology.
- `./2026-07-18-hermes-ops-register-casestudy.md` — the register these findings shaped.
- `unsigned-paas/docs/specs/agent-prompting-manual.md` — canonical house principles.
