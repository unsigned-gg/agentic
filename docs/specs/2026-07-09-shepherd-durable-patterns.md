<!-- lineage
role: design-spec
conforms_to: ../../CLAUDE.md
consumes: docs/eval/2026-07-07-agentic-ops-deep-research.md (§1 durable-execution + rainbow patterns, verified 3-0), docs/eval/2026-07-07-agentic-ops-gap-closure.md (Q1 Temporal verdict, verified 3-0 ×2), packages/shepherd/README.md (retained-run executor model, claude-only), docs/eval/2026-07-06-shepherd-omp-adoption.md (executor-lane constraints)
-->

# shepherd durable patterns: resume-from-error checkpoints + rainbow version-shifting

Status: proposed · Scope: design only, no implementation in this PR · Ticket: OPS-482

## Problem statement

`packages/shepherd/` (pinned `shepherd-ai` 0.2.1) is the retained-run
supervisor for sandboxed agent work: a task is a Python signature with no
body, a jailed `claude`-executor agent fulfils it, and the result lands as a
reviewable changeset settled with `select`/`release`/`discard`
(`packages/shepherd/README.md`). Today a retained run that dies mid-flight —
host loss, jail crash, harness upgrade landing under it — has no resume path;
the README's own "Verified" section records the current failure mode: "a demo
run that crashes mid-flight ... can leave the workspace `readiness blocked`
for later runs — a fresh `shepherd init` directory clears it." That is
restart-from-scratch, which the verified research explicitly rules out:
"resume-from-error checkpointing (‘restart from beginning is unacceptable’) +
rainbow deployments so code pushes never kill in-flight runs" is confirmed
3-0 as a required discipline for long-running agents, with no engine or
checkpoint mechanism prescribed
(`docs/eval/2026-07-07-agentic-ops-deep-research.md` §1). This spec fills that
blueprint gap for shepherd specifically.

Two anti-goals up front, both already settled by prior evaluation and not
reopened here:
- **No new executor.** The retained-run sandboxed executor accepts only
  `runtime={"provider": "static" | "claude"}`; pointing it at pi/omp is a
  source fork, out of scope
  (`docs/eval/2026-07-06-shepherd-omp-adoption.md`). Checkpointing design
  below treats the executor as a black box that emits a stream of
  agent-turn events, not as something to be forked.
- **No durable-engine adoption yet.** Temporal is the only engine with
  verified production LLM-agent evidence, but adopting it now would be
  scheduling-cargo-culting: the gap-closure verdict is explicit that a
  durable engine is not warranted for scheduling alone
  (`docs/eval/2026-07-07-agentic-ops-gap-closure.md` Q1, Q4). §4 below defines
  the concrete conditions under which that changes.

## 1. Checkpoint model

### 1.1 What must persist to resume, not restart

A shepherd retained run is a sequence of **agent turns** inside one jailed
executor session, bounded by `shepherd init` (workspace `.vcscore/` creation)
at one end and `select`/`release`/`discard` (settle) at the other. To resume
where a crashed run left off — not from `shepherd init` — the checkpoint must
capture everything needed to reconstruct the executor's next input without
re-running completed turns:

- **Run identity**: workspace path, `.vcscore/` state directory, task
  signature (the `May[GitRepo, ReadOnly|ReadWrite]`-typed binding set) — the
  permission grant the jail enforces must be re-derivable byte-for-byte on
  resume, not re-declared, since a changed grant on resume would be a
  silent privilege change.
- **Turn log**: ordered list of completed agent turns, each with the
  executor's `stream-json` envelope output (shepherd's `ClaudeHeadlessProvider`
  transport, per the adoption eval) captured verbatim, plus a monotonic turn
  index and a completion marker (turn finished vs. turn in-flight-when-killed).
- **Changeset state so far**: the retained-output diff accumulated up to the
  last completed turn, in the same representation `shepherd run changeset`
  already reads back from — this is existing shepherd state, not new
  surface; the checkpoint references it rather than duplicating it.
- **Harness/shepherd version fingerprint**: the exact `shepherd-ai` version
  and executor CLI version (`claude --version`) the run started under. This
  is the join key for §2 (rainbow shifting) — a checkpoint written under one
  version resumes under that same version, never a newer one, until the run
  completes.
- **Last-good watermark**: a single pointer (turn index) marking the last
  turn whose output was durably written to the changeset. Resume replays
  from watermark+1, never from turn 0.

What deliberately does NOT go in the checkpoint: any semantic summary,
plan, or memory of *what the agent has learned* — that is Engram's lane
(§3). The checkpoint is mechanical run state: "which turns completed, what
did they produce, what permissions apply," not "what does the agent now
believe."

### 1.2 The LLM-call boundary discipline

The gap-closure doc's non-determinism pattern applies directly: "LLM
inference lives in activities (never workflow code); replay safety comes
from CI that continuously downloads production workflow histories and
replays them" (`docs/eval/2026-07-07-agentic-ops-gap-closure.md` Q1, medium
confidence). Shepherd has no workflow engine, but the same boundary
discipline applies to the checkpoint writer:

- **A turn is the retry-unit, not a token or a tool call.** Each call into
  the `claude`-executor CLI is treated as an opaque, non-deterministic,
  retryable operation with a defined input (accumulated context + task
  signature) and a defined output (the `stream-json` envelope for that
  turn). The checkpoint writer commits a turn to the log only after the
  full envelope is received and the resulting changeset delta is written —
  never mid-stream. A killed-mid-turn run always resumes by **re-issuing
  the same turn**, not by trying to splice a partial stream back together.
  This is the practical shape of "non-deterministic calls behind retryable
  activity-style boundaries" for a single-process supervisor with no
  workflow engine underneath it.
- **Idempotency at the boundary, not inside it.** Because a resumed turn
  re-runs the executor call from the same accumulated-context input, the
  turn must be safe to execute twice against the *sandbox*, even though the
  model call itself is non-deterministic (a re-run may produce a
  different, but equally valid, completion for that turn — this is
  accepted, not solved; shepherd's own settle step is the human/reviewer
  checkpoint that catches divergence). Filesystem writes inside the jail
  are already staged as a retained changeset rather than applied directly,
  which makes turn-level retry safe by construction: a re-run turn
  overwrites the pending changeset delta for that turn index rather than
  compounding onto a partially-applied write.

### 1.3 Storage: plain-disk today, PVC-hibernation-ready

Two substrates, one format:

- **Plain-disk (current substrate, ship first)**: checkpoint log lives
  alongside the existing `.vcscore/` state directory, e.g.
  `.vcscore/checkpoints/<run-id>/turns/<NNNN>.json` (one file per completed
  turn, append-only, plus a `watermark` file holding the last-committed
  index). Append-only-plus-watermark means a crash between "turn file
  written" and "watermark advanced" is detectable and safely re-resumed
  from the watermark, not the latest file — the watermark is the
  single source of truth for "what actually completed."
- **Future agent-sandbox PVC-hibernation substrate (OPS-477)**: the deep-
  research doc confirms scale-to-zero hibernation is a shipped k8s
  controller capability, but "OSS preservation is disk/PVC hibernate-and-
  remount... it externalizes pod/filesystem state — the agent's SEMANTIC
  state stays the application's job"
  (`docs/eval/2026-07-07-agentic-ops-deep-research.md` §2). This is
  directly compatible with the plain-disk format above with zero format
  change: if `.vcscore/checkpoints/` sits on the Sandbox CRD's PVC, a
  hibernate-and-remount cycle preserves the exact same append-only turn
  log and watermark file. The design requirement this imposes now is only
  that the checkpoint path be **relative to the workspace root, not the
  host**, so it survives being remounted under a different pod/hostname —
  already true of `.vcscore/`-relative paths. No additional work is needed
  today beyond keeping checkpoints inside the workspace directory tree
  shepherd already owns.
- **Write cadence**: one checkpoint write per completed turn (not per
  token, not on a timer). Turn granularity is the natural unit because it
  is also the retry-unit (§1.2) and typically bounds sandboxed-agent
  turns to seconds-to-low-minutes of work — an acceptable amount to redo
  on resume, and cheap enough in write volume to not need batching.

## 2. Rainbow version-shift protocol

Goal, per the verified pattern: "rainbow deployments so code pushes never
kill in-flight runs" (`docs/eval/2026-07-07-agentic-ops-deep-research.md`
§1) — a shepherd/harness pin bump (this repo's `install.sh`
`SHEPHERD_VERSION` or the `claude` CLI pin it rides on) must not orphan or
corrupt an in-flight retained run.

- **Version fingerprint is part of the checkpoint (§1.1).** Every run
  records the `shepherd-ai` version and executor CLI version it started
  under, at `shepherd init` time.
- **Old runs finish on the old version.** A retained run resumes only
  against the shepherd/executor version recorded in its own checkpoint.
  This repo already installs shepherd as a pinned `uv tool` (not a shared
  system package), so multiple pinned versions can coexist on one host via
  `uv tool install --force "shepherd-ai==<pinned>"` per version tag,
  invoked through a version-pinned wrapper rather than the bare `shepherd`
  on `PATH`. The practical mechanism: an in-flight run's resume path
  invokes `uvx shepherd-ai==<fingerprinted-version>` (or an equivalent
  pinned-venv shim) rather than whatever `install.sh` most recently put on
  `PATH`.
- **New runs start on the new version.** `install.sh`'s existing pin-bump
  flow (deliberate PR-per-bump, per this repo's charter) is the only path
  that changes what a fresh `shepherd init` records as the starting
  fingerprint. No in-flight run is affected by an `install.sh` re-run,
  because in-flight runs never re-read the ambient pin after `init` — they
  read their own checkpoint's fingerprint.
- **Cutover completion, not forced migration.** There is no "upgrade an
  in-flight run" path in this design — that would require replaying turn
  history against a different executor version, which is exactly the
  replay-safety problem Temporal's CI-replay discipline exists to solve
  and shepherd has no workflow engine to do that with (see §4). A pin bump
  is "safe" here in the same sense as a k8s rainbow deployment: old pods
  (old-version runs) drain naturally as they complete; nothing forces them
  onto the new version mid-flight.
- **Bounded staleness, not indefinite.** Because shepherd's `install.sh`
  uses `--force` (single active install per pin change, per
  `packages/shepherd/install.sh`), supporting "old runs finish on old
  version" requires retaining the prior pinned venv until the last run
  fingerprinted to it settles. This is the one net-new mechanism this
  section adds: a resume-time check that, if the fingerprinted version is
  no longer installed, fails closed with an explicit "run <id> requires
  shepherd-ai==<version>, not currently installed" error rather than
  silently resuming under whatever version is ambient. Silent version
  drift on resume is worse than a blocked resume — it reintroduces exactly
  the "replay under a different version" hazard rainbow shifting exists to
  avoid.

## 3. Engram boundary

State externalization — "summarize completed phases to external memory,
retrieve the stored plan at context limits, spawn fresh subagents with
clean contexts" — is confirmed field consensus and explicitly named as
"already Engram's lane," separate from the durable-execution pattern this
spec covers (`docs/eval/2026-07-07-agentic-ops-deep-research.md` §1, §4
act-on item 3). The line:

- **Checkpoints (this spec) are RUN state**: mechanical, per-run, owned by
  shepherd, deleted when the run settles (or retained briefly for audit,
  TBD implementation detail — not a design fork). Scoped to one retained
  run's lifetime between `init` and settle. Answers "what has this run
  done and where did it stop."
- **Engram state is SEMANTIC state**: cross-run, cross-session memory —
  summarized plans, learned facts, prior-run outcomes — retrieved
  deliberately by an agent turn's context construction, not replayed
  mechanically on crash-resume. Answers "what does the agent know."
- **They must not fight over the same store.** A shepherd checkpoint must
  never become a de facto memory store (e.g., an agent reading its own
  prior turn's raw `stream-json` envelope back as "memory" instead of
  going through Engram's summarization path) — that would duplicate
  Engram's retrieval/compression job inside shepherd with none of its
  qualification work ("some retrieval/compression techniques underperform
  on agent-memory tasks," same source, §1) and would tie shepherd's
  storage format to memory-quality concerns it has no business owning.
  Conversely, Engram must not be asked to answer "did turn 7 of run
  `abc123` complete" — that is a run-state query the checkpoint watermark
  (§1.3) answers directly and cheaply; routing it through Engram would add
  a network hop and a semantic-memory dependency to a mechanical resume
  check.
- **Interaction with OPS-480 (hermes-memory boundary question)**: OPS-480
  raises the analogous question for hermes-agent's memory surface. The
  same test applies there: if the candidate state is "what happened
  mechanically in this run and can it be replayed/resumed," it is run
  state and belongs next to the executor (shepherd's checkpoint model, or
  hermes's own run log if hermes ever grows retained runs); if it is
  "what has been learned and should be retrievable in a future, unrelated
  run," it is Engram's. OPS-480 should cite this section rather than
  re-deriving the boundary independently — the two tickets should not
  converge on different answers to the same question asked of two
  different harnesses.

## 4. Temporal escalation criteria

The gap-closure verdict: "don't adopt a durable engine for scheduling
alone... if agent loops need real resume-from-error semantics, self-host
Temporal on the POSTGRES persistence path (small-scale tier, not
Cassandra/ES) — or defer until the Restate/DBOS evidence gap closes"
(`docs/eval/2026-07-07-agentic-ops-gap-closure.md` Q1). §1–§2 above are the
"defer" path: they cover shepherd's actual current need (single-host,
single-process, one-jail-at-a-time retained runs) without an external
engine. That coverage has hard edges. Escalate to Temporal-on-Postgres when
any of the following becomes true — these are the concrete conditions, not
a vague "if it gets complex":

1. **Cross-process resume.** Today's design assumes the process that
   detects a crashed run (or a human running `shepherd doctor`) is the same
   host that holds `.vcscore/`. If resume needs to be triggered from a
   *different* process/host than the one that crashed — e.g., a
   supervisor service watching many workspaces and re-dispatching resumes
   — the checkpoint-as-local-file model stops being sufficient; a
   workflow needs externally durable, queryable state, which is exactly
   what Temporal's workflow history provides.
2. **Multi-day runs surviving host loss**, not just process crash. §1.3's
   PVC-hibernation path covers *planned* hibernate/remount and *unplanned*
   process death on the same host/volume. It does not cover the host or
   volume itself being lost (node eviction without PVC, cluster
   migration). If retained runs are expected to survive that class of
   failure, the checkpoint needs to live in a replicated store a workflow
   engine's persistence layer already provides, not a workspace-local
   file.
3. **Fan-out coordination.** Today's model is one retained run, one jail,
   one linear turn sequence. If a future shepherd task needs to fan out
   into multiple concurrent jailed sub-runs with a join/aggregation step
   (the orchestrator-worker pattern this shop already uses at the harness
   level, per §1 of the deep-research doc), coordinating multiple
   independently-resumable checkpoints with cross-run dependencies is a
   workflow-engine problem (parent/child workflow, signal/wait) that a
   flat per-run turn log does not model.
4. **Replay-safety auditing becomes a requirement.** If it becomes
   necessary to prove that a resumed run's remaining turns would replay
   identically against production history (the discipline OpenAI's
   platform team runs in CI, per the gap-closure doc), that requires a
   workflow-history abstraction and replay tooling shepherd does not have
   and should not build from scratch — that is Temporal's core value
   proposition, not a checkpoint-format add-on.

**What Temporal-on-Postgres would look like here, if triggered**: one
workflow per retained run (workflow ID = shepherd run ID, giving free
dedup against double-resume); each agent turn as an Activity (the
non-deterministic `claude`-executor call, with Temporal's built-in
Activity retry replacing the manual re-issue-the-turn logic in §1.2);
workflow state = the same turn-log-plus-watermark shape from §1.1, now
held in Temporal's Postgres-backed history instead of `.vcscore/`; version
fingerprinting from §2 maps directly onto Temporal's native worker
versioning (noted as possibly dated in the gap-closure doc — OpenAI
rejected it at evaluation time, Temporal shipped new versioning since;
re-verify before relying on it). Self-hosted Postgres persistence, not
Cassandra/Elasticsearch — matching this shop's existing scale and the
gap-closure doc's "small-scale tier" recommendation. This is a scoping
sketch, not a spec; if any trigger above fires, it earns its own eval pass
before implementation, per this shop's evidence-before-adoption posture.

## 5. Implementation tickets to cut

For OPS-482 follow-up filing (Linear writes deliberately deferred — API
writes are rate-limited today; list is for the filer, not this PR):

1. **shepherd: turn-boundary checkpoint writer**
   Acceptance: after each completed agent turn in a retained run, a
   checkpoint file is written under `.vcscore/checkpoints/<run-id>/turns/`
   containing the full `stream-json` envelope for that turn, the turn
   index, and an advanced `watermark` file; a process kill between turns
   leaves the watermark at the last fully-committed turn (verified by a
   kill-and-inspect test, not just code review).

2. **shepherd: resume-from-watermark CLI path**
   Acceptance: `shepherd run resume <run-id>` (or equivalent) reconstructs
   the executor's next input from the checkpoint (workspace, task
   signature, accumulated changeset, next turn index) and continues from
   watermark+1 without re-running completed turns; a crash-mid-turn
   scenario resumes by re-issuing exactly that turn, verified against the
   idempotency behavior in §1.2 (re-run overwrites the pending delta for
   that turn index, does not duplicate or compound it).

3. **shepherd: version-fingerprint gate on resume**
   Acceptance: `shepherd init` records `shepherd-ai` version + executor CLI
   version into the run's checkpoint; `resume` refuses to proceed under a
   different installed version than the fingerprint, failing closed with
   an explicit version-mismatch error (not a silent resume); a test
   demonstrates a fingerprint-mismatched resume attempt is rejected.

4. **shepherd/install.sh: retained-venv-per-pin during rollout windows**
   Acceptance: pin-bump procedure (README-documented) supports keeping the
   prior pinned `uv tool` venv installed and addressable
   (`uvx shepherd-ai==<old-version>`) until the operator confirms no
   fingerprinted in-flight runs remain on it; `install.sh` `--force`
   behavior and this retention requirement are reconciled explicitly in
   the README rather than left as a footgun.

5. **docs: Engram/shepherd state-boundary note in both packages' READMEs**
   Acceptance: `packages/shepherd/README.md` gains a short pointer to §3 of
   this spec (checkpoints are run state, not memory); whatever package
   OPS-480 lands hermes-memory work in gets the same pointer, so both
   harnesses cite one shared boundary definition instead of two
   independently-drifting ones.

6. **eval: Temporal-on-Postgres spike, gated on §4 triggers**
   Acceptance: not scheduled proactively — filed as a blocked/backlog
   ticket referencing the four §4 conditions as its explicit trigger
   criteria, so it surfaces for re-evaluation only when one of them is
   observed in practice, not on a calendar or vibes basis.
