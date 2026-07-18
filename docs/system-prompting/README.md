<!-- lineage
role: index
conforms_to: ../../README.md
-->

# system-prompting — methodology corpus

Consolidated reference for authoring system prompts (standing-agent registers) and user
prompts (per-turn task framing) across the estate's harnesses. Grounds the house prompting
manual (`unsigned-paas/docs/specs/agent-prompting-manual.md`) in the empirical structure of
production system prompts, and works one real example end-to-end.

## Contents

| Doc | What it is |
|---|---|
| [`2026-07-18-system-prompting-methodology.md`](./2026-07-18-system-prompting-methodology.md) | The synthesized methodology — system-prompt principles (corroborating the house manual) + the user-prompt half the manual omits. |
| [`2026-07-18-leaks-corpus-analysis.md`](./2026-07-18-leaks-corpus-analysis.md) | Empirical analysis of `todie/system_prompts_leaks` (438 prompts, 18 vendors) — seven findings on how real production prompts are structured. |
| [`2026-07-18-hermes-ops-register-casestudy.md`](./2026-07-18-hermes-ops-register-casestudy.md) | The methodology applied to the cerebral-agent (hermes) ops register, including a charter/tool-mismatch finding from the live pod. |

## Source of truth
- **Canonical principles**: `unsigned-paas/docs/specs/agent-prompting-manual.md`. This
  corpus corroborates and extends it; it does not supersede it.
- **Leaks corpus**: `todie/system_prompts_leaks` (fork of `asgeirtj/system_prompts_leaks`).
  The fork is stale — **sync it from upstream before mining** (the analysis here used current
  upstream content as of 2026-07-18).
- **Evals**: the register evaluation protocol lives in `unsigned-paas` `lace/evals/`.
