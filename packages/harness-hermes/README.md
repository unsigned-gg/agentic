<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: local-models/README.md (endpoint wiring)
-->

# harness-hermes

[hermes-agent](https://github.com/NousResearch/hermes-agent) (Nous Research)
at curated pin **`hermes-agent` 0.18.0** — the harness built by the lab whose
open-weight Hermes models it pairs naturally with.

```bash
./install.sh     # uv tool install at the pin + local-endpoint preset
hermes setup     # interactive wizard for provider auth (Portal/OpenRouter/etc.)
```

**Install-path note:** upstream's documented install is `curl … | bash`. That
is banned in this repo (never pipe remote scripts to a shell), so `install.sh`
uses `uv tool install hermes-agent[anthropic]==0.18.0` — the same PyPI package
the upstream script resolves to, without executing unreviewed remote code.

## What you get

- **`config/cli-config.local-endpoint.yaml`** → seeded to
  `~/.hermes/cli-config.yaml` if absent: points hermes at a local
  OpenAI-compatible endpoint (vLLM :8000 default; ollama/llama.cpp are a
  one-line `openai_base_url` change). **Config-key caveat:** validate keys
  against `hermes config list` on your installed version — upstream moves
  fast (0.18.0 "The Judgment Release" is 2026-07-01); the preset is
  test-gated only for YAML validity, localhost-only URLs, and secretlessness.
- Skills: hermes consumes agentskills.io skills and self-improves them
  ("procedural memory") — install the shared set via
  `packages/skills/install.sh`.
- Tools/MCP: 40+ built-in tools (`hermes tools` to configure); MCP servers
  attach via `hermes setup` / config.

## Cluster cousin

unsigned-paas runs this same upstream (pinned 0.16.0) as a kagent BYO agent
with an A2A shim (`unsigned-paas/applications/hermes-agent*`). This package is
the *local/workstation* harness; bumping the cluster pin to 0.18.0 is tracked
in Linear, not done here.

## Verdict — 0.18.x memory/skill-loop review (OPS-480, 2026-07-08)

Review-only: **no version bump.** The 2026-07-07 landscape survey
(`docs/eval/2026-07-07-model-harness-landscape-survey.md`) flagged hermes-agent
as fastest-growing on the strength of "three-tier persistent memory
(semantic/working/episodic) + a closed skill-writing learning loop" and asked
whether that postdates our 0.18.0 pin. Findings below come from reading
`hermes_cli/config.py` on `NousResearch/hermes-agent@main` directly (config
defaults, the v11→v12 provider-schema normalizer, and the write-approval
migration), not from docs or blog summaries, several of which turned out to
be wrong or imprecise (noted below). Upstream has since shipped 0.18.1 and
0.18.2 patch releases (2026-07-07); this review is against the 0.18.0
"Judgment Release" behavior since that's what's pinned.

### What's actually there at 0.18.0

- **Memory is not three-tiered.** The built-in provider is two flat
  Markdown files — `MEMORY.md` (agent notes, 2200-char cap) and `USER.md`
  (user profile, 1375-char cap) — stored at `~/.hermes/memories/` and
  injected into the system prompt. Defaults: `memory.memory_enabled: true`,
  `memory.write_approval: false` (writes land with no review gate). A
  `memory.provider` slot exists for 7 external providers (Honcho, Mem0,
  Hindsight, Supermemory, OpenViking, holographic, retaindb) but is empty
  by default — none of them is Engram, and there is no adapter hook for a
  custom provider. The "semantic/working/episodic" framing in the survey is
  secondary-source terminology describing the general memory-architecture
  pattern, not a config surface this version exposes — there is no
  independent on/off switch per tier.
- **The skill-writing loop is present and on by default, unrestricted.**
  `/learn` and the `skill_manage` tool distill reusable `SKILL.md` files
  into `~/.hermes/skills/` after complex tasks, error-recovery, or user
  correction. Governance is `skills.write_approval` (default `false` — free
  writes) and `skills.guard_agent_created` (default `false` — no
  content-pattern scan). One secondary source claimed a `skills.auto_create`
  gate defaults it off; that key does not exist in source — treat that
  claim as wrong.
- **Provider-config schema is fine as pinned.** A closed 2026-04 upstream
  issue (#8776) reported the `providers:` dict format being write-only
  (migration wrote it, nothing read it back) — that's fixed on `main`:
  `get_compatible_custom_providers()` now merges both `custom_providers:`
  (legacy list) and `providers:` (dict) into one runtime view, and the
  normalizer accepts `api`/`url`/`base_url` as URL-key aliases and both
  list- and dict-shaped `models:`. Our `config/cli-config.local-endpoint.yaml`
  preset (`providers.<key>.api`, `models:` as a string list) matches this
  and needed no schema fix. A separate, still-**open** bug (#43713) affects
  `hermes profile` sub-configs replacing rather than merging the parent's
  `providers:` — irrelevant to us since this preset doesn't use profiles.

### Engram boundary — the real question

If hermes memory stays on with its default unrestricted writes, hermes and
Engram independently accumulate the same class of fact (operator
preferences, environment conventions) with no reconciliation between the
two stores — not a corruption risk (they're separate files/DBs), but a
drift risk: two silently-diverging "memories of the operator," one of which
(hermes's) is invisible to session-bootstrap, Obsidian, and every other
harness. Engram is this repo's designated cross-harness, cross-session
memory system per the operator's global config. Lane assignment adopted
here: **hermes's built-in memory tier goes off entirely**
(`memory.memory_enabled: false` in the local-endpoint preset); Engram
remains the sole long-term memory of record across all four harnesses.
Skills are a different domain (hermes-local executable procedures, no
Engram equivalent) — the self-improvement loop stays on, but
`skills.write_approval: true` now gates agent-authored skill writes behind
a review step (`/skills pending` / `/skills diff` / `/skills approve`),
since they currently land with zero review and can carry inline shell
(`skills.inline_shell`, off by default, unaffected by this change).

Related: OPS-482 (in progress, separate branch) is defining
checkpoint-vs-memory boundaries for shepherd's durable-patterns work — same
category of problem, different subsystem. Not a blocker for this verdict;
cross-check the two once OPS-482 lands.

### Preset diff applied

```diff
+ memory:
+   memory_enabled: false
+ skills:
+   write_approval: true
```

in `config/cli-config.local-endpoint.yaml`. `tests/test_presets.py` (YAML
validity, localhost-only URLs, secretlessness) and
`tests/test_pin_drift.py` (pin/README agreement) both still pass — this
change doesn't touch the version pin.

### Cluster-pin skew note

unsigned-paas's kagent BYO agent is still on 0.16.0 against this package's
0.18.0 — a two-minor-version gap. Tracked as a separate bump, not addressed
here.
