<!-- lineage
role: eval
conforms_to: ../../README.md
consumes: packages/harness-pi/README.md (harness conventions), packages/harness-hermes/README.md (python-lane conventions)
-->

# Evaluation: shepherd (runtime substrate) + omp (oh-my-pi) adoption

Date: 2026-07-06 · Status: proposed · Scope: evaluation only, no implementation in this PR.

Evaluates two candidates against the repo charter (curated known-good harnesses,
pin-everything, no `curl | bash`):

1. **shepherd** — `shepherd-agents/shepherd`, PyPI `shepherd-ai==0.2.1`. Runtime
   substrate that records agent runs as reversible execution traces; sandboxed
   agents produce retained outputs reviewed before anything touches the tree.
2. **omp (oh-my-pi)** — `can1357/oh-my-pi`, npm `@oh-my-pi/pi-coding-agent@16.3.11`,
   binary `omp`. A hard fork of pi-coding-agent, candidate fourth harness.

## Summary & recommendation

**shepherd: adopt now**, as a sibling package `packages/shepherd/` using the stock
`claude` executor. It installs pip/uv-native with an exact pin, holds no secrets in
presets, and — verified live on this WSL2 host — its Landlock syscall jail is
available and its offline (keyless) path works end-to-end (see appendix). It is
early alpha (v0.2.x, APIs may change), which the exact pin and a "Verified" README
section absorb; that is the same posture the repo already takes toward its
harnesses. Driving pi/omp as shepherd's executor is explicitly **out of scope**:
the retained-run executor lane is not pluggable (detail below).

**omp: watch, don't adopt yet** — *overridden by operator decision (see
Decisions below): adopt now.* The evaluation's reservations stand as the risk
record: adoption costs a new runtime toolchain (Bun ≥ 1.3.14, not previously in
`.prototools`), the release cadence (multiple releases per day) works against
the curated-known-good charter, and it is not config-compatible with the pinned
pi harness — it is a fourth harness, not a pi variant. The capability case (RPC/
headless modes, LSP-wired edits, first-class subagents, agentskills.io skills)
carried the decision; the pin-churn posture (deliberate bumps, trailing latest)
is the mitigation.

## omp as a fourth harness

**Identity.** Hard fork of pi (badlogic/pi-mono), re-based versioning (omp 16.x vs
pi 0.80.x), TypeScript-on-Bun monorepo plus a Rust core (in-process ripgrep/glob/
shell, filesystem isolation primitives). Tracking-in-spirit only; not a patch set.

**Install (charter-compliant pin).** `bun install -g @oh-my-pi/pi-coding-agent@16.3.11`.
The advertised front door is `curl -fsSL https://omp.sh/install | sh` — rejected
per charter, same substitution the hermes package documents. Cost: **Bun ≥ 1.3.14**
is a hard requirement (`engines.bun`; Bun Workers, `with { type: "text" }`
imports). `.prototools` currently pins node/pnpm/python/uv/moon only, so adoption
adds a toolchain entry, and the package would follow the hermes shape (own lane,
no `pnpm-workspace.yaml` entry) rather than the pi/opencode node lane.

**Config surface.** User config at `~/.omp/agent` (`models.yml`, YAML; JSON/JSONC
also supported), project config in `.omp/`. It co-reads `.claude`, `.codex`, and
`.gemini` config trees natively — but **not** `~/.pi`. The existing
`harness-pi/config/models.json` preset would be re-expressed as a `models.yml`
preset; custom providers speak OpenAI-compatible (plus anthropic/google/azure
dialects), so the local-models endpoints (ollama/llamacpp/vllm) and the neuralwatt
gateway port over directly.

**Skills.** Native agentskills.io `SKILL.md` support at `~/.omp/agent/skills` —
adoption is one added entry in the `TARGETS` array of `packages/skills/install.sh`.

**Extensions.** omp's extension model is "Gemini-style" (MCP servers, tools,
context via manifest). No pi-extension loader was found; assume
`harness-pi/extensions/local-model-switch.ts` does **not** load unchanged and
would be rewritten against omp's plugin surface (`--plugin-dir`, `--hook`).

**Headless / supervisor surface** (relevant to any future supervision work):
one-shot `omp -p`, `--mode json`, stdio `--mode rpc`, ACP; sessions via
`--session-dir` + `--continue`/`--resume`. The in-repo `python/robomp` reference
supervisor drives `omp --mode rpc` subprocesses against per-issue git worktrees
with a credential-holding proxy on a separate network — a working blueprint if
this repo ever wants an omp lane under external supervision.

**Risks.**
- Release cadence: multiple releases per day; a pin goes stale within hours of
  cutting it. Curation cost is materially higher than pi (0.80.x cadence).
- Bun-native: new toolchain to pin, bootstrap, and CI-provision for one package.
- Isolation is filesystem/worktree-level, not an OS syscall sandbox.
- Single-maintainer fork; bus-factor risk for a curated harness set.

**Adoption checklist (when revisited):** add bun to `.prototools`; create
`packages/harness-omp/` (hermes-shape: install.sh with `OMP_VERSION` pin +
copy-if-absent `config/models.yml`, README with lineage + Verified sections,
`moon.yml`); add `~/.omp/agent/skills` to `packages/skills/install.sh`; row in
root README table; decide extension parity (port `/local` command or drop).

## shepherd as a sibling package (claude executor)

**What it is.** Tasks are Python signatures with no body; a sandboxed agent
fulfils the contract at runtime. Work lands as a *retained output* — reviewable
via `shepherd run changeset`, settled with `select`/`release`/`discard` — and the
trace is durable either way. Permissions are declared per-binding in the task
signature (`May[GitRepo, ReadOnly|ReadWrite]`) and enforced at the native syscall
jail (macOS Seatbelt; Linux Landlock): a write outside the grant is refused at
the syscall, not caught at a merge gate.

**Why the executor stays `claude`.** Shepherd has two provider layers and only
one is open:

- The in-process model-call layer (`model="claude:…"`) is multi-provider
  (Claude/OpenAI/OpenCode/LiteLLM via `shepherd-providers`).
- The **retained-run sandboxed executor** — the layer that produces changesets —
  accepts exactly `runtime={"provider": "static" | "claude"}`
  (`shepherd_dialect/workspace_control/runtime_provider.py`,
  `WorkspaceRuntimeProviderKind`). The Claude executor
  (`ClaudeHeadlessProvider`, `shepherd_dialect/providers.py`) is hardcoded to the
  `claude` CLI and its `stream-json` envelope; the transport seam is documented
  as "deliberately not a public provider plugin ABI". A `codex` provider exists
  in source but is gated off.

Pointing shepherd at pi or omp as executor is therefore a source fork (new
provider class + extending the runtime-provider resolver and dispatch), not
configuration. Out of scope; revisit only if upstream ships a provider ABI.

**Verified on this host (WSL2, kernel 6.6.87.2).** `shepherd doctor claude`
passes 8/8 — including `native-jail: available` — and the keyless offline
quickstart runs end-to-end (appendix). Notable because upstream only *validates*
Linux Landlock inside containers; the WSL2 kernel ships
`CONFIG_SECURITY_LANDLOCK=y` with landlock first in `CONFIG_LSM`, and the jail
establishes on bare WSL2. Placement semantics are safe by construction:
`placement="jail"` fails closed where the jail is unavailable; `"auto"` degrades
visibly to advisory.

**Proposed package shape (follow-up PR, not this one).**
`packages/shepherd/`, hermes-style python lane:
- `install.sh`: `SHEPHERD_VERSION="0.2.1"`, guard on `uv`,
  `uv tool install "shepherd-ai==${SHEPHERD_VERSION}"`.
- No config preset: shepherd keeps no user-level config; state is per-workspace
  (`.vcscore/`, created by `shepherd init`), and auth rides the existing `claude`
  CLI credentials. Nothing secret to template — charter-clean.
- README: lineage block; quickstart (`init` → `doctor claude` → offline demo);
  Verified section (doctor + offline demo CI-viable keyless via the `static`
  provider; jailed claude runs need live auth).
- `moon.yml` `tags: ['python']`; no `pnpm-workspace.yaml` change; skills
  `TARGETS` untouched (shepherd is not a skills consumer).

**Risks.** Early alpha — APIs may change between releases (absorbed by the exact
pin + deliberate-bump policy); Linux enforcement not upstream-validated outside
containers (mitigated: doctor gate verified locally, `jail` fails closed);
subscription-auth quirk documented upstream (short-lived signed-in sessions can
fail inside the sandbox; `CLAUDE_CODE_OAUTH_TOKEN` or API key is the reliable
shape — this host uses `ANTHROPIC_API_KEY`, which doctor validates).

## Fit with repo charter

| Criterion | shepherd | omp |
|---|---|---|
| Pinned, package-manager-native install | `uv tool install shepherd-ai==0.2.1` | `bun install -g @oh-my-pi/pi-coding-agent@16.3.11` (front door is curl\|bash; substituted) |
| No secrets in presets | Nothing to preset | `models.yml` preset, localhost/gateway URLs only |
| Toolchain already pinned | yes (python/uv) | **no** (adds Bun) |
| Upstream cadence vs curation | alpha but slow (v0.2.1) | multiple releases/day |
| Verified locally | doctor 8/8 + offline demo green | not exercised (Bun absent) |

## Decisions (operator interview, 2026-07-06)

1. `packages/shepherd/` implementation: **proceed now** (delivered as its own
   PR: pinned install, README runbook, pin-drift tests).
2. omp: **adopt now**, including the Bun 1.3.14 `.prototools` addition
   (delivered as `packages/harness-omp/` in its own PR; eval reservations
   retained above as the risk record).
3. shepherd Verified bar: **includes the jailed live-claude smoke**, not just
   the keyless static demo (result recorded in the appendix).

## Verification appendix

Verified **live on this host** (2026-07-06, WSL2 6.6.87.2-microsoft-standard-WSL2):

- PyPI `shepherd-ai` latest = `0.2.1`, requires-python `>=3.11` (registry JSON).
- npm `@oh-my-pi/pi-coding-agent` dist-tag latest = `16.3.11` (registry JSON).
- Kernel: `CONFIG_SECURITY_LANDLOCK=y`; `CONFIG_LSM` lists landlock first
  (`/proc/config.gz`).
- `shepherd doctor claude --json` in a scratch workspace: 8/8 ok —
  python 3.12.3, cwd, git, vcscore, workspace (backend=auto),
  **native-jail: available**, claude-cli found, claude-auth via
  `ANTHROPIC_API_KEY`.
- Offline quickstart (`shepherd demo write quickstart`, static provider,
  keyless): run `retained`, changeset listed `SHEPHERD_QUICKSTART.txt`,
  settled `released`.
- Jailed live-claude smoke (`shepherd demo write agent-task`): agent ran in
  the Landlock jail, `donut.py` retained (nothing applied), changeset read
  back, settled `discard`. One operational caveat: a demo run crashed
  mid-flight (wrong interpreter) left that workspace `readiness blocked` for
  subsequent runs; a fresh `shepherd init` directory cleared it.
- omp installed at 16.3.11 via `bun install -g` (bun 1.3.14 from proto pin):
  `omp --version` → `omp/16.3.11`; `models.yml` preset seeded. Bun blocked
  two dependency postinstalls (`onnxruntime-node`, `protobufjs`) under its
  default trust model — core CLI unaffected.

From **source reading** (not executed): omp headless/RPC flags, config
resolution order, skills/extension mechanisms, robomp architecture
(`can1357/oh-my-pi` @ v16.3.11); shepherd provider-layer split and executor
hardcoding (`shepherd-agents/shepherd` @ v0.2.1 tree). Not confirmed: omp's
`--mode json` output schema; whether omp loads pi-specific extensions; any omp
OS-level sandbox.
