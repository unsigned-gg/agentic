<!-- lineage
role: eval-deepdive
conforms_to: ../../CLAUDE.md
consumes: docs/eval/2026-07-07-model-harness-landscape-survey.md (sandboxing section)
provenance: web-research agent 2026-07-07 (sources inline); vendor numbers flagged; re-verify before acting on any single figure.
-->

# Sandbox / execution-layer deep-dive: Northflank · Modal · E2B — 2026-07-07

Operator-commissioned follow-up to the landscape survey's sandboxing section.
Use case under evaluation: sandboxed execution for long-running/background
agents, self-host-preferred, existing k8s + ArgoCD + Harbor + OpenBao +
Cloudflare-edge footprint.

## Northflank

- **SEO finding (observed, not inferred)**: across ~15 distinct survey queries
  (sandboxes, PaaS, BYOC, runners, managed DBs, GPU pricing), a
  northflank.com/blog post was the top or dominant organic result essentially
  always. The category's "independent comparison" layer is substantially one
  vendor's funnel — discount third-party-looking "Northflank is best X".
- **Company**: London, founded 2019 (Will Stewart, Frederik Brix), $24.9M
  raised (Bain-led A, 2024-11), ~20-29 people, ~$2.1M rev 2025 (Latka).
  Sentry is a verified customer (Sentry's own site); "Writer" claim
  vendor-only. G2 4.9/5 on just 11 reviews vs claimed 50k devs — the gap is
  itself a data point. Mixed support reviews consistent with thin team, wide
  surface. Risk class: VC-runway (vs SST's chose-to-pivot).
- **Product**: PaaS + 7 managed DB engines + GPU (vendor-claimed ~$2.74/hr
  H100 all-in) + **BYOC across 8 targets incl bare-metal/on-prem, all plans**
  + **sandboxes with per-workload Kata-or-gVisor choice, no session time cap**,
  $0.01667/vCPU-hr + $0.00833/GB-hr per-second. Cold-start claims internally
  inconsistent (sub-1s marketing vs 2s elsewhere in their own content).
- **Steal-as-pattern**: preview environments with auto-provisioned/torn-down
  per-PR DB instances → replicable on our ArgoCD pipeline as ephemeral
  namespace-per-PR + scoped OpenBao lease + disposable DB. Also the
  per-workload isolation-choice API shape (Kata vs gVisor) if we build our own
  execution layer.
- **Verdict: watch, leaning pragmatic for one narrow case** — don't adopt the
  platform; steal the preview-env pattern; if the CF 30-min cap blocks a real
  workload, bench Northflank-BYOC vs E2B on that workload (BYOC = execution
  inside our own cloud boundary is the one compelling hook).
- **"Is it just Sandcastle?" — REFUTED, usefully.** No "Sandcastle" backend
  exists to wrap: the name collides across ≥4 unrelated small OSS projects
  (mattpocock's TS agent-orchestrator, a pip `sandcastle-ai`, a vercel-labs
  PoC, another orchestrator) plus Meta's internal CI (pure name collision).
  Zero evidence pairs Northflank with any of them. Northflank's own docs are
  consistent: **Kata Containers + Cloud Hypervisor via containerd** (QEMU /
  gVisor / Firecracker as alternates), with upstream contributions to those
  projects. Better than confirmed: the ENTIRE isolation stack is standard
  CNCF-adjacent OSS with no proprietary core — every component assembles on
  our own cluster with no Northflank dependency.
  [architecture](https://northflank.com/blog/how-to-sandbox-ai-agents) ·
  [Cloud Hypervisor guide](https://northflank.com/blog/guide-to-cloud-hypervisor)

[funding](https://www.finsmes.com/2024/11/northflank-raises-22-3m-in-funding.html) ·
[Latka](https://getlatka.com/companies/northflank.com) ·
[Sentry ref](https://sentry.io/customers/) ·
[sandbox blog](https://northflank.com/blog/how-to-sandbox-ai-agents) ·
[pricing](https://northflank.com/pricing) ·
[BYOC](https://northflank.com/features/bring-your-own-cloud) ·
[preview envs](https://northflank.com/product/preview-environments)

## Modal

- **Data-quality flag**: reported ARR spans $6.3M → ~$50M → $300M across
  months of coverage — press repeating founder-supplied numbers; treat all as
  unverified.
- **Company**: founded 2021, Erik Bernhardsson (ex-Spotify ML) + Akshat Bubna.
  $466M raised, $4.65B valuation (May 2026 C, 4x in under a year, ~50x revenue
  by one account — explicit bubble-skepticism coverage). 150-165 people: the
  one dimension where Modal is SAFEST of the three (no bus-factor risk),
  alongside being the worst architectural fit.
- **Product**: Python-first serverless (`@app.function()`), 2-4s typical cold
  starts, transparent per-second GPU pricing (H100 ~$4.29/hr), native cron +
  1M-input job queues, sandboxes on gVisor positioned for high-concurrency
  short agent tool-calls, not persistent sessions.
- **Key finding: NO BYOC, no on-prem, no self-host path of any kind** —
  corroborated by absence across Modal's own docs, not just competitor
  content. Hard mismatch with our OpenBao/hardened-image/self-host posture.
- **Verdict: architecturally excluded** for sandboxed agent execution — no
  further evaluation. Legit best-in-class for Python batch/inference/training
  if that need ever arises separately.

[TechCrunch valuation](https://techcrunch.com/2026/02/11/ai-inference-startup-modal-labs-in-talks-to-raise-at-2-5b-valuation-sources-say/) ·
[Series C](https://techstartups.com/2026/05/21/modal-labs-raises-355m-quadrupling-valuation-to-4-65b-as-ai-infrastructure-demand-surges/) ·
[cron docs](https://modal.com/docs/guide/cron) ·
[pricing](https://modal.com/pricing) ·
[bubble coverage](https://www.aicerts.ai/news/modal-labs-valuation-fuels-ai-market-bubble-debate/)

## E2B

- **Data-quality flag**: Latka's "$1.5M ARR, $4.6M valuation" is internally
  inconsistent with a $21M Series A — stale/mis-scraped. "88% of Fortune 100"
  + "500M sandboxes" trace to founder-sourced PR framing.
- **Company**: founded 2023, Vasek Mlejnsky + Tomas Valenta (SF + Prague),
  $48.3M raised (Insight-led $21M A, 2025-07), **18 people** — smallest team
  of the three vs the largest claimed enterprise footprint; bus-factor risk
  applies most acutely here.
- **Product**: Firecracker microVMs exclusively (hardware-level isolation vs
  Kata/gVisor). Sessions default 5-10 MIN — the "24h" figure is a Pro-plan
  ceiling needing explicit extension, not default behavior (PoC must confirm).
  **Standout: pause/resume with full filesystem+memory snapshot, 5-30ms
  restore** — nothing Northflank or Modal documents comes close; a
  long-running agent's env can freeze instead of staying live-and-billed.
- **Self-host: VERIFIED real** — `e2b-dev/infra`, Apache-2.0, Terraform +
  Nomad + Consul + Firecracker. GCP fully supported, AWS beta. "Not a helm
  install": a second orchestration paradigm alongside k8s/ArgoCD, budget as an
  infra project. Enterprise SaaS floor $3,000/mo; private-cloud tier exists.
- **Adoption signal — best of the three**: named, checkable production users:
  Perplexity, Hugging Face, UC Berkeley LMArena (230k+ sandboxes).
- **Verdict: pragmatic for a scoped pilot, watch for production commitment** —
  if self-hosted hardware-isolated sandboxing gets serious, PoC the OSS path
  on our own metal; it's an ops project, not a subscription.

[persistence docs](https://e2b.dev/docs/sandbox/persistence) ·
[infra repo](https://github.com/e2b-dev/e2b) ·
[self-host guide](https://www.beam.cloud/blog/how-to-self-host-code-sandbox) ·
[pricing](https://e2b.dev/pricing) ·
[VentureBeat](https://venturebeat.com/ai/how-e2b-became-essential-to-88-of-fortune-100-companies-and-raised-21-million)

## Head-to-head (ranked for our use case)

1. **Build on our own paas (gVisor/Kata on existing k8s)** — zero vendor risk,
   full session-semantics control, substrate (OpenBao/Harbor/hardened images)
   already exists. Concrete starting point (via the Sandcastle investigation):
   **Kubernetes SIG "Agent Sandbox"** (agent-sandbox.sigs.k8s.io) with Kata
   Containers + Cloud Hypervisor — the same fully-OSS stack Northflank itself
   runs, already solving this orchestration problem upstream
   ([k8s blog 2026-03](https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox/) ·
   [Kata integration](https://katacontainers.io/blog/kata-containers-agent-sandbox-integration/)).
   Right default unless a concrete requirement justifies paying: the two
   candidates are Firecracker snapshot/resume (→ E2B) or managed multi-cloud
   BYOC orchestration (→ Northflank).
2. **E2B self-hosted** — best isolation + the 5-30ms snapshot/resume that
   nothing else has; cost is operating Nomad/Consul alongside ArgoCD. Worth it
   only if snapshot/resume specifically matters.
3. **Northflank BYOC** — managed control plane on infra we already run, no
   session cap, dual isolation choice; pay only if the single-control-plane
   convenience beats owning the layer. (Sandcastle verification pending.)
4. **Cloudflare Sandboxes** — sub-50ms cold starts, already in our orbit;
   30-min cap = fine for bursts, not a long-running-agent answer.
5. **Modal** — excluded: no self-host path at all; use for Python
   batch/inference if ever needed, never for this.

**Action line**: default to building on our own cluster with gVisor (Kata
where kernel-level isolation is needed); reach for E2B's OSS path only when a
workload needs Firecracker snapshot/resume badly enough to justify a second
orchestration stack.
