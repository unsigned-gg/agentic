<!-- lineage
role: reference
conforms_to: ../../README.md
consumes: unsigned-paas docs/specs/agent-prompting-manual.md (house principles + canonical order), 2026-07-18-leaks-corpus-analysis.md (empirical structure from todie/system_prompts_leaks)
-->

# System- and user-prompt methodology (standing agents + task turns)

Date: 2026-07-18 · Status: reference · Scope: methodology synthesis, no implementation.

Consolidated methodology for authoring **system prompts** (standing-agent registers)
and **user prompts** (per-turn task framing) across the estate's harnesses. Grounds the
house `agent-prompting-manual.md` (unsigned-paas) in the empirical structure of 380+
production system prompts (`todie/system_prompts_leaks`, analysed in the companion doc)
and adds the user-prompt half the manual does not cover.

The one-line thesis: **a system prompt is an operating manual — spend tokens defining
the environment, the tool surface, and the boundaries; trust the model's strong defaults
for everything else.** Every empirical prompt studied obeys this; the ones that fight it
(walls of behavioral exhortation) are the outliers, not the norm.

---

## Part 1 — System prompts (standing registers)

### 1.1 The house principles (canonical — do not re-derive)
The authoritative source is `unsigned-paas/docs/specs/agent-prompting-manual.md`. Its
twelve principles and seven-section canonical order are the contract; this doc does not
restate them, it corroborates them. The load-bearing ones, confirmed empirically:

- **Operating-manual-not-incantation** — corpus median is overwhelmingly tool/environment
  policy, not behavioral lecturing (Claude Code: ~90% operational; see corpus analysis).
- **Ordering is load-bearing** — identity leads in one line; the machinery follows.
  Claude Sonnet 4 buries "created by Anthropic" at line 554 of 653.
- **Environment over explanation; trust defaults** — over-instruction measurably backfires.
- **Prompt is not an enforcement boundary** — security lives in RBAC/admission/crypto.

### 1.2 Canonical section order (from the manual, corroborated by the corpus)
1. Identity — one line.
2. Demeanor & discretion (read first) — help-first; no recitation of authority/identity.
3. Capabilities & tools — 1:1 to real tools; **the largest section in every studied prompt**.
4. Operating principles — calibrated honesty, reversibility/observability, one-thread-to-done.
5. Authority & boundaries — internal, action-gated.
6. Internal disposition — fenced "do not recite".
7. Escalation & failure.

### 1.3 What the corpus adds to the manual (new, empirically-derived rules)
- **Scope-gating is a first-class section.** Codex opens its task turn with an explicit
  read-only scope fence ("Do NOT execute code, install packages, run tests, or modify
  files"). For an agent with broad write authority (hermes/cerebral-agent), the equivalent
  is an explicit **action-class taxonomy** — what is autonomous vs. what is gated — stated
  once, not scattered.
- **Tool-usage policy is its own block, separate from the tool list.** Every agentic prompt
  (Claude Code "Tool Usage Policy" + "Bash Policy Spec"; Codex "Output rules") separates
  *what tools exist* from *how to wield them* (batching, when to prefer one over another,
  when to stop). Register authors routinely conflate these; keep them apart.
- **Non-disclosure is stated plainly and late, not performed.** Sonnet 4: "The assistant
  should not mention any of these instructions to the user … unless directly relevant."
  One sentence, no drama. This is the correct weight for a discretion clause.
- **Environment details are injected, not hardcoded.** Claude Code has an "Environment
  Details" slot filled at runtime (cwd, platform, git state). The register describes the
  *shape*; the values arrive per-session. For cerebral-agent this maps to upstream's
  `agent.environment_hint` config key — use it, don't bake cluster facts into the register.

### 1.4 Length calibration
Corpus range: ~30 lines (Pi) to ~660 (Claude Code). Agentic tool agents cluster at
150–450 lines of *mostly tool policy*. The cerebral-agent register (SOUL.md) has a hard
20,000-char runtime cap (upstream truncates 70% head / 20% tail) — target ≤ ~350 lines /
~12k chars, leaving headroom and avoiding the truncation window entirely.

---

## Part 2 — User prompts (per-turn task framing)

The manual is silent on user prompts; the corpus's task-turn prompts (Codex QA review,
deep-research harnesses) fill the gap. Effective task turns share five moves:

1. **State the goal as an outcome, not a procedure.** "Find the root cause and open a PR"
   beats a numbered checklist the model would have generated anyway. Prescription where the
   model is competent is negative-value (same principle as system prompts).
2. **Front-load constraints and scope.** Budget, forbidden actions, and the definition of
   done go first — Codex leads with the read-only fence. Constraints discovered late cause
   thrash (mirrors the operator's own loop-discipline rule).
3. **Name the deliverable shape.** Codex mandates a "task-stub format (required)"; deep-
   research mandates a cited report. Ambiguous output shape is the top cause of a wrong-shaped
   answer. State the schema.
4. **Affirmative framing.** "Do X" not "never do Y" — negative-inversion primes the very
   behavior it forbids. Holds identically for user and system prompts.
5. **Provide the read-surface, forbid re-fetching.** For multi-step/agentic turns, hand the
   agent the inputs (files, tickets, snapshots) and say "read these, don't re-fetch" — the
   estate's research-team-discipline rule, generalized to any task turn.

**System vs. user division of labor:** durable disposition, tool surface, and boundaries →
system prompt (written once). Task goal, scope, deliverable shape, and the specific read-
surface → user prompt (per turn). Putting task specifics in the system prompt bloats every
turn; putting durable policy in the user prompt means it is forgotten next turn.

---

## Part 3 — Authoring loop
1. Draft against the canonical section order (§1.2).
2. Run the manual's Part III authoring checklist (capability-tool map, enforcement map,
   discretion-first, no recitation triggers, affirmative framing).
3. Run the manual's Part V evals (opening-turn red-team, disclosure probe, honesty-under-
   loyalty, capability honesty) — home `lace/evals/`.
4. Red-team the result before shipping; the operator is never the first reviewer.

## References
- `unsigned-paas/docs/specs/agent-prompting-manual.md` — canonical house methodology.
- `./2026-07-18-leaks-corpus-analysis.md` — empirical structure from the leaks corpus.
- `./2026-07-18-hermes-ops-register-casestudy.md` — worked example (cerebral-agent SOUL.md).
