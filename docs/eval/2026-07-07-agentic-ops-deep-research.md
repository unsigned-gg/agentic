<!-- lineage
role: eval-research
conforms_to: ../../CLAUDE.md
consumes: docs/eval/2026-07-07-model-harness-landscape-survey.md, docs/eval/2026-07-07-sandbox-execution-layer-deepdive.md
provenance: /deep-research workflow 2026-07-07 — 106 agents, 24 sources fetched, 119 claims extracted, top 25 adversarially verified (3-vote): 24 confirmed, 1 refuted. Findings below are the verified survivors; coverage gaps are stated, not papered over.
-->

# Agentic systems in production: architecture · orchestration · observability — 2026-07-07

Deep-research pass scoped to this shop (self-hosted k8s PaaS, llm.unsigned.gg
LiteLLM gateway, Claude-Code-primary, curated harness monorepo, long-running
agents). Every finding below survived 3-vote adversarial verification with
sources; first-party vendor numbers are labeled as such.

## 1. Architecture (verified patterns)

- **Orchestrator-worker is production-proven, with brutal economics.**
  Anthropic's shipped Research feature (Opus lead + Sonnet subagents) beat
  single-agent by 90.2% on their internal eval (FIRST-PARTY number), but
  multi-agent runs cost ~15× chat tokens (single agents ~4×; Gartner's
  independent range 5-30× brackets it), and ~80% of the performance variance
  is explained by token spend — the gain is largely compute-scaling. Reserve
  multi-agent for high-value, parallelizable, context-exceeding tasks.
  [Anthropic engineering](https://www.anthropic.com/engineering/multi-agent-research-system) · 3-0
- **Durable execution is pattern-solved, not blueprint-solved**: resume-from-
  error checkpointing ("restart from beginning is unacceptable") + rainbow
  deployments so code pushes never kill in-flight runs. Anthropic names no
  engine or checkpoint mechanism — the pattern is verified, the implementation
  is left to you. 3-0
- **State externalization is field consensus**: summarize completed phases to
  external memory, retrieve the stored plan at context limits, spawn fresh
  subagents with clean contexts. Corroborated by 2026 academic work (AMA-Bench,
  ICLR 2026 MemAgents, RE-TRAC); the one qualification is that some
  retrieval/compression techniques underperform on agent-memory tasks. 3-0

## 2. Deployment + orchestration on k8s

- **kubernetes-sigs/agent-sandbox is the official primitive** (SIG Apps):
  four CRDs — Sandbox, SandboxTemplate, SandboxClaim, SandboxWarmPool.
  Sandbox = declarative single stateful pod with stable hostname + optional
  PVC, replacing the StatefulSet-of-1 + headless-Service hack (official k8s
  blog: "an operational nightmare" at scale). v0.5.0 (2026-06-24), pre-GA
  (alpha→beta), one named production user (Lovable). Third independent
  convergence on this project this week (landscape survey → Sandcastle
  investigation → this pass). 3-0 ×4
- **Isolation is RuntimeClass composition, and it's shipped, not aspirational**
  — the counter-claim ("direction only") was REFUTED 0-3. Pair with gVisor
  (kernel-level) or Kata (VM-grade) via `runtimeClassName`; Kata project
  independently confirmed the integration. Operator installs the runtime node
  pools; Sandbox adds lifecycle/identity, not the sandboxing itself; network
  isolation stays a NetworkPolicy concern. 3-0 ×2
- **Scale-to-zero hibernation with state-preserving resume** is a shipped
  controller capability — but OSS preservation is disk/PVC hibernate-and-
  remount; fast in-memory snapshot/resume is platform-specific (GKE Pod
  Snapshots). It externalizes pod/filesystem state — the agent's SEMANTIC
  state stays the application's job (see §1 externalization). 3-0 ×2
- **Zero-trust agent identity is emerging but churning**: Kagenti (Red Hat
  incubation) auto-injects SPIRE SVID rotation + Keycloak OAuth2 client
  registration per agent — no static keys in agent namespaces (Keycloak admin
  creds still static in the operator namespace). Verified 2-1; the tested CRD
  shape was already deprecated by the next alpha. Pattern to watch, not adopt.
- **Kagenti is NOT production-ready** (v0.2.0-alpha.19, Red Hat's own
  hands-on report): no dynamic peer discovery, imageTag changes not
  propagating, no workflow engine; its bundled Phoenix+OTel stack silently
  dropped traces on a 4318-vs-4317 OTLP port mismatch; no token/cost metrics,
  no Prometheus endpoints. 3-0 ×2

## 3. Observability + analysis

- **OTel GenAI semconv is the de-facto vendor-neutral standard, in real use,
  at Development status.** Agent span hierarchy (invoke_agent → chat per LLM
  call → execute_tool; operations create_agent/invoke_agent/invoke_workflow/
  plan/execute_tool; gen_ai.agent.id, gen_ai.conversation.id); span name
  `{operation} {model}`; operation.name + provider.name Required,
  usage.input/output_tokens Recommended; prompt/completion content OPT-IN only
  (explicit PII posture). Breaking renames have already happened
  (gen_ai.system → gen_ai.provider.name); migration path is the
  OTEL_SEMCONV_STABILITY_OPT_IN dual-emission mechanism. Spec moved to the
  dedicated open-telemetry/semantic-conventions-genai repo. 3-0 ×5
- **LiteLLM ≥1.86.0 is a standards-shaped tracing chokepoint TODAY** —
  directly actionable for llm.unsigned.gg: set
  `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` and the gateway
  emits semconv-conforming spans with gen_ai.usage.input/output_tokens AND
  per-request USD cost as gen_ai.cost.* (a LiteLLM extension — official
  semconv has no cost attribute). Caveats: the cost key has churned across
  versions (don't hardcode), and cost only appears for models the pricing
  engine knows (local/ollama lanes need model_info cost config). Verifiers
  confirmed attribute writes in source (opentelemetry.py ~2152-2283). 3-0 ×2
- **Claude Code itself: metrics + logs via OTel are the stable surface; trace
  export is beta** behind `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`. A
  Claude-Code-primary shop cannot yet rely on GA-quality full agent traces
  from the harness. 3-0

## Coverage gaps (explicitly unanswered, not settled)

Verification produced NO surviving claims on: durable-workflow engines for
agent loops (Temporal/Restate/Inngest/Argo — the biggest open piece for the
paas), the self-hosted tracing-backend comparison (Langfuse vs Phoenix vs
Braintrust vs LangSmith — specifically which consume the gen_ai agent spans
LiteLLM emits), eval-in-CI tooling, and queueing/cron patterns for scheduled
agents. Open questions on file: engine-in-production evidence; backend
semconv-consumption; agent-sandbox GA timing + WSL2/single-node RuntimeClass
parity; whether Claude Code's eventual GA trace shape joins LiteLLM spans into
one trace tree (semconv repo's claude-agent-sdk reference scenarios hint yes).

## Refuted

- "gVisor/Kata support is direction-only, not shipped" — 0-3 against the
  agent-sandbox README + implementation guides + Kata project confirmation.

## Act-on for this stack

1. **Gateway tracing pilot (cheap, immediate)**: LiteLLM ≥1.86.0 +
   `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` → OTLP into any
   generic backend; per-key cost attribution composes with the OPS-465 lane
   keys. Pin the semconv version; don't hardcode gen_ai.cost.* key names.
2. **agent-sandbox spike on the dev cluster**: Sandbox + SandboxWarmPool with
   `runtimeClassName: gvisor` — the build-it-ourselves execution layer from
   the sandbox deep-dive now has its concrete CRD surface. Pre-GA: spike, not
   prod.
3. **Adopt the two Anthropic disciplines in shepherd/harness design**:
   resume-from-error checkpoints + rainbow-style version shifting for
   long-running agents; state externalization is already Engram's lane.
4. **Defer** tracing-backend choice and durable-engine choice — the evidence
   didn't survive verification; both need their own targeted pass (open
   questions above) rather than a vibes pick.
