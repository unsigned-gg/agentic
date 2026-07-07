<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: docs/eval/2026-07-06-shepherd-omp-adoption.md (adoption rationale)
-->

# shepherd

[shepherd](https://github.com/shepherd-agents/shepherd) runtime substrate at
curated pin **`shepherd-ai` 0.2.1** — records agent runs as reversible
execution traces; sandboxed agents produce *retained outputs* reviewed with
`shepherd run changeset` and settled with `select`/`release`/`discard` before
anything touches the working tree. Task permissions are declared per-binding
in the Python signature (`May[GitRepo, ReadOnly|ReadWrite]`) and enforced at
the native syscall jail (Linux Landlock; macOS Seatbelt).

```bash
./install.sh              # uv tool install at the pin (installs `shepherd` + `sp`)
cd some-repo
shepherd init             # per-workspace substrate (.vcscore/)
shepherd doctor claude    # core + jail + claude CLI/auth readiness (--probe = live round-trip)
```

Not a harness: this package is the supervision layer next to the harnesses.
The sandboxed executor lane is **claude-only by design** in v0.2.x — the
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
  (`uv run --with "shepherd-ai==0.2.1" python agent_task.py`), not the bare
  system `python3`.

## Placement semantics (why WSL2 works)

`placement="jail"` fails closed where the OS jail is unavailable; `"auto"`
degrades visibly to advisory. Upstream validates Linux Landlock only inside
containers, but the jail is self-contained (unprivileged Landlock, kernel
5.13+): on this repo's reference WSL2 host (kernel 6.6.87.2,
`CONFIG_SECURITY_LANDLOCK=y`) `doctor` reports `native-jail: available` and
jailed runs execute. Always gate on `shepherd doctor claude`, not assumption.

## Verified

CI-gated: install-script pin format + README/pin agreement (`tests/`),
shellcheck, ruff. Exercised live on WSL2 (2026-07-06, kernel 6.6.87.2):

- `install.sh` → `shepherd, version 0.2.1`, executables `shepherd` + `sp`.
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

Needs live exercise per-host: jail availability (kernel-dependent) and claude
auth — both reported by `shepherd doctor claude`.
