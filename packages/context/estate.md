# Estate Brief — unsigned / cerebral infrastructure

Orientation for any agent harness operating on this machine. This is an index,
not a manual: it tells you what exists, where the authoritative doc lives, and
how to take in live context. Facts here are stable; **live state always comes
from a probe, never from this file** — run the `estate-orient` skill at the
start of infra work.

## Operator & identity

- Operator: Christian Todie — GitHub `todie`, unix `ctodie`, git author
  `Christian M. Todie`, email `chris@todie.io`. Platform: WSL2.
- All commits signed (GPG `29234C4D7EE749F2`). Never `--no-gpg-sign`.
- Trackers: Linear. Team prefixes: `OPS` = unsigned platform/infra,
  `CER` = Cerebral Work Institute (reverie et al.), `TOD` = personal/misc.

## The constellation (clusters)

- **Cygnus** — THE production cluster and, since the OPS-468 migration completed,
  the **SOLE** cluster: all-metal Talos (Vultr bare metal, ewr, Cilium+WireGuard),
  promoted from the ex-Vela bench 2026-07-07. Hosts `*.unsigned.gg`.
  kubeconfig `~/.kube/cygnus`, talos context `cygnus`.
- **Lyra** — the ex dev VKE cluster, **DECOMMISSIONED 2026-07-18 (OPS-468 migration
  DONE)**: TF module removed, ArgoCD single-cluster (zero remote-cluster secrets),
  edge cut over. There is one cluster (Cygnus) — **no dev VKE, no rollback target**;
  do not assume one exists. The dual-target VKE+Talos `deploymentTarget` model is retired.
- Reserved names: Orion (GCP burst-GPU satellite), Pleiades (Hetzner, if ever).
  Doctrine: single-zone Vultr. **GPU/inference pivoted to a rented A100→colo path
  (OPS-549) — the in-cluster gpu-pool / Dynamo-Triton design is abandoned.**
- Platform stack (Cygnus): ArgoCD (GitOps, **manual sync** for stateful/CRD/
  credential apps + a small auto-sync set), Traefik + cert-manager + cloudflared
  edge, Keycloak (OIDC/SSO), OpenBao + External Secrets, Harbor (images+charts),
  observability = Prometheus/Alertmanager (HA) + Thanos + Loki + **Tempo** (Jaeger
  retired) + Grafana + VictoriaMetrics/Pyrra/Langfuse/Phoenix, CNPG (postgres, 3/3),
  Longhorn (storage), Tailscale, Kyverno + **SPIRE** (workload identity), **Forgejo**
  (git+CI), **LACE** (kagent+hermes) agent runtime, WireGuard mesh, Hubble/Tetragon.
  Live HA has SPOFs remaining (OpenBao/Keycloak/Loki/Tempo single-replica).

## Repo map (one line each; owner-bucket layout under ~/projects/)

- `unsigned/paas` (unsigned-paas) — the platform monorepo: Terraform, ~27 Helm
  charts, ArgoCD apps, CI, SOPs. THE infra repo. Read its `CLAUDE.md` first.
- `cerebral/reverie` — the reverie memory daemon (`reveried`) + mesh tooling.
- `todie/agentic` — harness configs (pi/opencode/hermes/omp), shared skills,
  local-model serving, this brief's source (`packages/context/`).
- `cerebral/terrarium` — moon-monorepo incubator + node registry (CANON.md).
- `cerebral/os` (cerebral-work/os) — soma build home: the agentic OS (reflex
  gate plane, trust-ledger, per-user hermes function-agent runtime, deck, cli,
  spec). SCAFFOLD as of 2026-07-18; verbs route through reflex once Phase 1
  lands. Read its CANON.md + docs/soma/ARCHITECTURE.md before touching.
- `reverie-cloud` (cerebral-work org) — Cloudflare Worker: alert webhooks, EA.
- Others: `cadastre` (CF/DNS IaC), `escapement`, `unsigned/gg` (GH org+repo
  `unsigned-gg` — design canon), `linearctl` (headless Linear CLI). herdr
  (agent session multiplexer) is an installed tool — no local checkout.

## Terminal multiplexer — herdr (NOT tmux)

The operator's terminal multiplexer is **herdr** (`~/.local/bin/herdr`; no
local checkout — installed tool). NO tmux server runs on this machine. All
pane/tab/layout/workspace ops and the agent-session lifecycle go through the
herdr socket API (`~/.config/herdr/herdr.sock`) or the `herdr` CLI.

- Server: `herdr status` (local client + running server). `herdr server stop` /
  `herdr server reload-config` manage the daemon. Config: `~/.config/herdr/config.toml`.
- Session discovery: `herdr session list` (workspaces), `herdr pane list`
  (all panes with cwd), `herdr agent list` (JSON: agent kind, status, cwd,
  pane_id, session path). **Parse `herdr agent list` before assuming which
  sessions are running or which pane is which agent.**
- Agent lifecycle: `herdr agent start <NAME> --kind <KIND> --pane <ID>` boots a
  supported agent (claude, omp, pi, codex, gemini, hermes, …) in an existing
  pane that is at its interactive shell prompt. Read output with
  `herdr agent read <pane_id> --lines N`. Drive input with
  `herdr agent send-keys`, `herdr agent prompt`, or `herdr agent wait`.
- Recon before touching an agent pane: `herdr agent read <pane_id> --lines 30`
  to see recent output and avoid destroying in-flight work.
- Do NOT `herdr agent start` into a pane that already has a live agent — quit
  the existing session first (`/exit` via `herdr agent send-keys` or prompt).
- Model lane / agent config lives OUTSIDE herdr: omp reads
  `~/.omp/agent/config.yml` (`modelRoles`: task/advisor/default keyed as
  `llm/<model>:<reasoning>`), Claude reads `~/.claude/CLAUDE.md` +
  `settings.json`. Restarting an agent session is how a config change takes
  effect for that pane.
- Keybindings emulate tmux (prefix=backtick, h/j/k/l pane nav, |/− splits).
  Plugins: command palette (prefix+p), lazygit (C-g), file viewer, reviewr.

## Doctrine & SOP index (authoritative docs, in-repo)

- unsigned-paas: `docs/sop/` (incl. auth-enforcement), `docs/platform-deployment-plan.md`
  (§11 release rules), `docs/argocd-appset-hardening.md`, chart standards in `CLAUDE.md`.
- Workflow invariants: PR-required on every repo (no direct push to main);
  deploy-first-on-dev (branch → apply to dev cluster → green → merge);
  a release is not a deploy — deploys are operator-gated; release-please
  semantic releases; kebab-case filenames; no `latest` image tags; images
  pinned; daemonless builds (ko / buildpacks / rootless BuildKit — kaniko retired).
- ArgoCD: everything manual-sync; ApplicationSet changes apply only via
  `git show origin/main:<file> | kubectl apply` (surface guard).
- Ops gotchas live in reverie + `~/.claude/projects/*/memory/` — search before
  re-deriving (e.g. Vultr managed-DB VPC IP drift, CNPG role-sync restart,
  Helm-4 value reuse, Tailscale LB is L4-only).
- Blast-radius & estate ops: `~/.agents/sops/blast-radius-and-estate-ops.md` —
  verify true blast radius before "fix/rotate/do it"; scoped fixes, stay in lane;
  LLM-gateway admin via tailnet (public host WAF-403s); large Harbor push via
  tailnet crane (OPS-810); kagent MCP deploy schema + FastMCP/conda-pack gotchas.

## Memory of record & context intake

- **Reverie is the sole cross-harness memory of record.** Daemon `reveried`
  (`~/.local/bin/reveried`; legacy-alias symlink `engram`), HTTP on
  `127.0.0.1:7437`, MCP server available (registered under legacy name `engram`).
  - Search: `GET /search?q=…` · Project context: `GET /context/smart?project=<name>&limit=15`
- Obsidian vault at `~/vault` is the operator's reflection layer.
- **Never claim "no prior context exists" without searching reverie + vault.**
- Live cluster/system claims require a fresh probe (kubectl, argocd via
  kubectl reads, curl) — never memory, tickets, or this file.

## Secrets model

- OpenBao (in-cluster) is primary; a 1Password vault is the interim store,
  read per-call via `op read` — item pointers live in private user config and
  reverie, never in this brief. Never echo a secret value.
- OpenBao carries the widest blast radius of any service on the estate: check
  blast radius before touching it or anything that fronts it.
- Exposed secret = compromised: flag for rotation immediately (the operator
  keeps a batch rotation list).

## LLM gateway

- Non-Claude model access: LiteLLM gateway, tailnet `http://llm/v1` — the
  reliable path. The public hostname has been unstable since the 2026-07-12
  shared-edge outage (OPS-603 tracks it); probe before relying on it.
  Key: via `op read` (item pointer in private user config).
- Quirk: transient 401 "cached plan must not change result type" = gateway DB
  hiccup — retry, do not rotate the key.

## Operator-gated actions (prepare, surface, wait for sign-off)

Merge to main · `terraform apply` · secret rotation/deletion · ArgoCD sync of
platform apps · external sends (email/Slack/publish) · anything irreversible.
