<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: docs/eval/2026-07-06-shepherd-omp-adoption.md (adoption rationale)
-->

# shepherd

[shepherd](https://github.com/shepherd-agents/shepherd) runtime substrate at
curated pin **`shepherd-ai` 0.3.0** — records agent runs as reversible
execution traces; sandboxed agents produce *retained outputs* reviewed with
`shepherd run changeset` and settled with `select`/`release`/`apply`/`discard`
before anything touches the working tree. Task permissions are declared per-binding
in the Python signature (`May[GitRepo, ReadOnly|ReadWrite]`) and enforced at
the native syscall jail (Linux Landlock; macOS Seatbelt).

```bash
./install.sh              # uv tool install at the pin (installs `shepherd` + `sp`)
cd some-repo
shepherd init             # per-workspace substrate (.vcscore/)
shepherd doctor claude    # core + jail + claude CLI/auth readiness (--probe = live round-trip)
```

Not a harness: this package is the supervision layer next to the harnesses.
The sandboxed executor lane is **claude-only by design** through v0.3.x
(re-verified against the 0.3.0 runtime-provider source) — the
retained-run provider accepts `static` (deterministic, keyless) or `claude`;
pointing it at pi/omp would be an upstream source fork, not configuration
(see the adoption eval in `docs/eval/`).

## What you get

- **Pinned CLI install, no config preset.** shepherd keeps no user-level
  config; state lives per-workspace in `.vcscore/` and the agent lane rides
  the `claude` CLI's own credentials. Nothing to seed, nothing secret.
- **Offline lane** (`runtime={"provider": "static"}`): keyless, CI-viable —
  `shepherd demo write quickstart` exercises init → run → retained changeset
  → settle without any model call.
- **Agent lane** (`runtime={"provider": "claude"}`): `shepherd demo write
  agent-task` runs a jailed Claude agent whose output lands as a reviewable
  changeset. Auth: `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`
  (`claude setup-token`); short-lived signed-in sessions may fail inside the
  sandbox — `shepherd doctor claude` reports which credential you have.
- **Python API note:** `uv tool install` exposes the CLIs only. Demo scripts
  (`agent_task.py` etc.) import `shepherd`/`shepherd_dialect`, so run them
  with an interpreter that has `shepherd-ai` installed as a library
  (`uv run --with "shepherd-ai==0.3.0" python agent_task.py`), not the bare
  system `python3`.

## Placement semantics (why WSL2 works)

`placement="jail"` fails closed where the OS jail is unavailable; `"auto"`
degrades visibly to advisory. As of 0.3.0 upstream executes grant enforcement
on both Linux (Landlock) and macOS (Seatbelt) — the 0.2.0 container-gated
validation caveat is retired. The jail remains self-contained (unprivileged
Landlock, kernel 5.13+): on this repo's reference WSL2 host (kernel 6.6.87.2,
`CONFIG_SECURITY_LANDLOCK=y`) `doctor` reports `native-jail: available` and
jailed runs execute. Always gate on `shepherd doctor claude`, not assumption.

## Operational runbook (live-agent runs)

The retained-run lifecycle from the quickstart demo scales to real agent work,
but the surface has three operational gaps the quickstart doesn't exercise.
All three were hit during a real multi-file Rust refactor run (2026-07-09,
reverie CER-1190, on 0.2.1); the fixes are mechanical and repeatable, and
every internal they rely on was re-probed as present and unchanged in 0.3.0
(`budget_seconds` default still 240, transport seam, recovery API,
readiness query).

### 1. Budget: the default 240 s is too short for refactors with compile checks

`workspace.run(runtime={"provider": "claude"})` constructs the
`ClaudeHeadlessProvider` with `budget_seconds=240` (hardcoded default). That's
enough for the donut demo but not for a multi-file edit + `cargo check` cycle
on a large workspace — the agent gets `BudgetExhausted` mid-flight and the run
fails. The budget is **not exposed** through the `runtime` dict (which only
carries `provider` and `model`); you patch it at the transport seam:

```python
from shepherd_dialect.workspace_control import runtime_provider as rp
from shepherd_dialect.providers import ClaudeHeadlessProvider

BUDGET_SECONDS = 900   # 15 min — enough for a multi-file refactor + cargo check
MAX_TURNS = 40

def _patched_transport(invocation):
    return ClaudeHeadlessProvider(
        provider_id=invocation.provider_id,
        prompt=invocation.prompt,
        model=invocation.model_name,
        budget_seconds=BUDGET_SECONDS,
        max_turns=MAX_TURNS,
    )

rp._WORKSPACE_RUNTIME_PROVIDER_TRANSPORTS = rp._WorkspaceRuntimeProviderTransports(
    claude=_patched_transport,
)
```

Set this **before** `workspace.run(...)`. The transport object is a frozen
dataclass holding one callable; replacing it is the only public-adjacent way
to raise the budget without a source fork. Revisit if upstream exposes
`budget_seconds` in the runtime plan.

### 2. Crashed runs orphan a scope that blocks readiness — `repair` won't fix it

A run that dies mid-flight (budget exhausted, host loss, wrong interpreter)
can leave an **orphaned scope ref** in `.vcscore/`. The next `workspace.run`
fails with `readiness blocked by run-XXXXXXXX`. `shepherd run repair`
reclaims orphaned *operation refs* only — it will report "Nothing to repair"
while the scope ref still blocks. The fix is the `VcsCoreApp` recovery API:

```python
uv run --with "shepherd-ai==0.3.0" python3 -c "
from vcs_core._app import VcsCoreApp, AppOpenMode
with VcsCoreApp.open_existing('.', mode=AppOpenMode.RECOVERY) as app:
    print(app.archive_orphaned_scopes())
"
```

This is the failure mode the durable-patterns spec (OPS-482) targets for
automated recovery. Until that lands, `archive_orphaned_scopes()` is the
manual unblock. Gate on it: if `shepherd run repair` says "Nothing to
repair" but `workspace.run` still fails with `readiness blocked`, run the
snippet above.

### 3. `select` moves into vcs-core custody, not the working tree

`shepherd run select <run>` settles the output (state → `selected`) but does
**not** materialize the files into the working tree — it moves the changeset
into its "live parent world" inside `.vcscore/`. To get the files into the
tree for compile-check, read them from the retained changeset and write them
yourself:

```bash
shepherd run changeset <run> --read <path> > <path>   # one file at a time
```

or batch-extract with a loop. The retained changeset is the source of truth;
`select`/`release`/`discard` are settlement actions, not filesystem
materialization — a gap inherent to the world/custody model. 0.3.0's fourth
verb, `apply` (three-way merge of a run's delta onto a workspace that moved
on, fail-closed on overlap), behaves the same way — **live-verified
2026-07-11: `apply` does NOT materialize the working tree.** `shepherd run
apply <run>` on a retained run settled the output (`unconsumed` → `applied`,
settlement action `applied`) and advanced the vcs-core parent world
(`parent_world_before` → `parent_world_after`; the merged candidate commit
inside `.vcscore/world-vectors/substrates/workspace.git` contains the run's
file under `workspace/`), but the real working tree was identical before and
after — file absent, `git status` unchanged, no commit on the repo's own
refs. What `apply` buys you is world propagation, not files: a run started
*after* the apply forks from the advanced parent world and sees the applied
paths in its basis. All four verbs settle custody inside `.vcscore/`; the
changeset-extract flow above remains the only way to get files into the
working tree.

### Pre-flight checklist for a real agent run

1. `shepherd doctor claude --probe` — 9/9 including live auth round-trip.
2. Check readiness if the workspace has prior runs:
   ```python
   uv run --with "shepherd-ai==0.3.0" python3 -c "
   from vcs_core._query_readiness import evaluate_readiness, ReadinessRequest
   r = evaluate_readiness('.vcscore', ReadinessRequest(command='shepherd.run'))
   print(r.state, len(r.blockers or []))
   "
   ```
   If `blocked`, run the `archive_orphaned_scopes()` snippet from §2.
3. Patch the budget (§1) if the task involves edits + compile/test cycles.
4. After the run: `shepherd run show <run>` (enforcement, terminal status),
   `shepherd run changeset --latest` (files), `--read <path>` (content).
5. To land the changes in the working tree: extract files from the changeset
   (§3), `cargo check` / test, then `git add` + commit. `select`/`apply` are
   optional settlement records, not the materialization step (§3).

## Verified

CI-gated: install-script pin format + README/pin agreement (`tests/`),
shellcheck, ruff. Exercised live on WSL2 (0.2.1 on 2026-07-06, 0.3.0 bump on
2026-07-09; kernel 6.6.87.2):

- `install.sh` → `shepherd, version 0.3.0`, executables `shepherd` + `sp`.
- `shepherd doctor claude --json` → 8/8 ok, including `native-jail: available`
  and `claude-auth` via `ANTHROPIC_API_KEY`.
- Offline quickstart (static provider, keyless) → run `retained`, changeset
  listed the written file, settled `released`.
- Jailed live-claude smoke (`shepherd demo write agent-task`) → agent ran in
  the Landlock jail, `donut.py` retained (nothing applied), changeset readable
  via `shepherd run changeset --latest --read donut.py`, settled with
  `discard`. Caveat observed: a demo run that crashes mid-flight (e.g. wrong
  interpreter) can leave the workspace `readiness blocked` for later runs —
  a fresh `shepherd init` directory clears it.
- **Real agent refactor** (2026-07-09, reverie CER-1190): jailed agent ran
  5.7 min with budget patched to 900 s / 40 turns, wrote a 10-file changeset
  (multi-crate `tracing-subscriber` consolidation), changeset reviewed
  file-by-file via `--read`, rustfmt-clean, all 4 sites replaced, `reveried`
  untouched. Three operational gaps documented above were all hit and
  resolved during this run.
- **0.3.0 bump verification** (2026-07-09): existing 0.2.1-era `.vcscore`
  workspaces open cleanly under 0.3.0 (`doctor` Ready; `shepherd run list`
  reads prior run history); offline quickstart green (run `retained`, settled
  `released`). Known limitation unchanged: worktree adoption still hard-fails
  on tracked symlinks and gitlinks (re-confirmed on 4 repos; OPS-524,
  upstream `_workspace_external.py` raises on both).
- **0.3.0 jailed live-claude smoke** (2026-07-11, WSL2 kernel 6.6.87.2):
  `shepherd demo write agent-task` ran end-to-end — `run show` reports
  `enforcement: jail (launch_confined_attempted)`, auth rode
  `ANTHROPIC_API_KEY`, `donut.py` retained (nothing applied to the tree),
  program executed straight from the changeset
  (`shepherd run changeset <run> --read donut.py | python3 -`), settled
  `discarded`.
- **0.3.0 `apply` verdict** (2026-07-11): on a retained static-provider run,
  `shepherd run apply <run>` exited 0 with settlement action `applied` and
  advanced the vcs-core parent world (merged candidate commit in
  `.vcscore/world-vectors/substrates/workspace.git` contains the run's file),
  while the working tree stayed byte-identical — no file materialized, no
  `git status` change, no commit. A subsequent run forked from the advanced
  parent world and carried the applied path in its basis. Confirms §3:
  `apply`, like the other three verbs, settles custody inside `.vcscore/`
  only; changeset-extract remains the materialization path.

Needs live exercise per-host: jail availability (kernel-dependent) and claude
auth — both reported by `shepherd doctor claude`.
