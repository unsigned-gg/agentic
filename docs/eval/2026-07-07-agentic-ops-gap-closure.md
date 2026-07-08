<!-- lineage
role: eval-research
conforms_to: ../../CLAUDE.md
consumes: docs/eval/2026-07-07-agentic-ops-deep-research.md (the four gaps this closes)
provenance: /deep-research workflow 2026-07-07 (second pass) — 104 agents, 22 sources, 104 claims extracted, top 25 adversarially verified (3-vote): 23 confirmed, 2 refuted. Coverage remains uneven per question; unevenness stated below.
-->

# Agentic-ops gap closure: durable engines · tracing backends · eval-in-CI · cron/queueing — 2026-07-07

Targeted second pass on the four gaps the first deep-research doc marked
unanswered. Each section ends with the "what this shop should run" verdict.

## Q1 — Durable-workflow engines for agent loops

- **Temporal is the only engine with verified production LLM-agent evidence
  this pass.** OpenAI runs agentic workflows on Temporal Cloud (~1B
  images/week through the migrated image service; 4-engineer platform team,
  700+ namespaces) and — despite being resource-rich — REJECTED self-hosting
  over operational burden. Figures are vendor-venue (Replay keynote) but
  customer-spoken and magnitude-consistent with OpenAI's public numbers.
  3-0 ×2.
- **The non-determinism pattern** (medium confidence): LLM inference lives in
  activities (never workflow code); replay safety comes from CI that
  continuously downloads production workflow histories and replays them, plus
  golden schema files failing CI on incompatible changes. OpenAI rejected
  native worker versioning (may be dated — Temporal shipped new versioning at
  Replay 2026). 3-0, evidence-graded medium.
- **Nothing survived on Restate/Inngest/Hatchet/DBOS/Argo** for LLM-agent
  loops — the single-binary-vs-Cassandra comparison the question asked for
  rests on one data point and stays open.
- **Verdict**: don't adopt a durable engine for scheduling alone (see Q4). If
  agent loops need real resume-from-error semantics, self-host Temporal on
  the POSTGRES persistence path (small-scale tier, not Cassandra/ES) — or
  defer until the Restate/DBOS evidence gap closes (open question filed).

## Q2 — Self-hosted tracing backends

- **Transport**: LiteLLM exports to any OTLP endpoint; semconv span naming is
  opt-in (`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`; default
  is a non-semconv `litellm_request` span). 3-0 ×2.
- **Cost attributes are a LiteLLM-proprietary extension squatting in the
  gen_ai namespace** — official semconv defines token counts only, NO cost
  attribute. No backend auto-maps `gen_ai.cost.*`; dashboards must key on the
  custom attributes. 3-0.
- **Langfuse: three concrete strikes** — (1) OTLP endpoint is HTTP-only (no
  gRPC; needs a collector bridge), (2) its documented cost mapping is
  `gen_ai.usage.cost`, a key LiteLLM never emits — `gen_ai.cost.*` appears
  nowhere in Langfuse docs (ingest unconfirmed, needs a 30-min empirical
  test), (3) open maintainer-acknowledged bug (issue #12657, unfixed as of
  today): Input/Output null for semconv v1.37+ events-format spans — the
  exact format Claude Code's native OTel emits. Agent spans (invoke_agent/
  execute_tool) also have no documented mapping (2-1, docs-scoped). 3-0/2-1.
- **SigNoz: full self-host parity verified** — generic OTLP path, nothing in
  the LiteLLM integration gated to cloud, dashboard templates are open JSON
  importable into the MIT community edition. The "SigNoz has no GenAI
  handling" counter-claim was REFUTED 0-3 (it likely has more semconv
  coverage than documented). 3-0 ×2.
- **LangSmith/Braintrust self-host tiers: no surviving claims** — unanswered.
- **Verdict**: self-hosted SigNoz as the OTLP trunk (traces+logs+metrics, one
  backend, MIT); optional collector-bridged tee to Langfuse ONLY after
  empirically verifying gen_ai.cost.* ingest and the #12657 fix. Don't buy
  the LLM-specific backend before the generic trunk proves insufficient.

## Q3 — Eval-in-CI for agent systems

- **promptfoo's GitHub Action is the most complete OSS merge gate**:
  fail-on-threshold as a required status check, flakiness handling via
  `repeat` + `repeat-min-pass` (pass-k-of-n for grader variance), PR summary
  comments, cost control via default-on disk caching with CI pruning. 3-0 ×3.
- **DeepEval**: credible Apache-2.0 agent-metric layer (Task Completion, Tool
  Correctness, Plan Adherence, multi-turn metrics) with pytest gating — but
  regression-baseline comparison is positioned as a Confident-AI-cloud
  feature; no OSS-side baseline storage/diffing/flakiness handling documented
  (README-scoped, one 2-1 component). 3-0 ×3 + 2-1.
- **EvalView**: early-stage, self-dogfooding only, marketing copy
  self-published — not an incumbent. 3-0.
- **Verdict**: promptfoo Action as the merge gate; Inspect AI (already the
  bench anchor from PR #11) for deep agent evals; skip DeepEval unless its
  agent metrics are worth carrying without OSS baselines. OSS baseline
  persistence pattern (in-repo JSON vs artifacts) left as an open question.

## Q4 — Cron/queueing for scheduled + background agents

- **KEDA ScaledJob is the verified pattern**: one isolated k8s Job per queued
  event (vs autoscaling a long-lived worker), explicitly positioned for
  long-running executions, native scale-to-zero (minReplicaCount=0 — empty
  queue means zero cluster spend). Concurrency cap via maxReplicaCount;
  `queueLength: 1` + accurate scaling strategy = one-agent-one-job. 3-0 ×2.
- **Nothing survived comparing NATS vs Redis vs RabbitMQ** for agent queues,
  nor on durable-engine schedules / cloud schedulers — pick the queue on
  in-house familiarity, not this doc.
- **Verdict**: plain CronJob for time-triggered agents + queue (NATS,
  already-adjacent) + KEDA ScaledJob for event-driven background agents. Do
  NOT adopt a durable engine just for scheduling.

## Refuted this pass

- "semconv v1.37+ events format breaks ALL attribute-parsing backends" — 0-3;
  the breakage is Langfuse-specific (#12657), not ecosystem-wide.
- "SigNoz has no GenAI-semconv-specific handling" — 0-3.

## Open questions (carried)

1. Langfuse gen_ai.cost.* ingest — 30-minute empirical test before any tee.
2. Restate/Hatchet/DBOS production evidence for agent loops (single-binary
   k8s story vs Temporal-on-Postgres).
3. OSS eval-baseline persistence + machine-diffable promptfoo output across
   nondeterministic runs.
4. LangSmith/Braintrust self-host gating; SigNoz agent-span first-class views.
