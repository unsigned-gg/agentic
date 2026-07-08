<!-- lineage
role: eval-survey
conforms_to: ../../CLAUDE.md
consumes: docs/eval/2026-07-06-shepherd-omp-adoption.md (harness posture), packages/local-models/MODELS.md (local tier)
provenance: web-research agent 2026-07-07 (sources inline); post-training-cutoff claims are researcher-sourced, not independently verified — re-verify numbers before acting on any single one.
-->

# Model + Harness Landscape Survey — 2026-07-07

Operator-commissioned sweep: models pragmatically/aspirationally useful for the
llm.unsigned.gg gateway + 32GB local tier, best-in-class long-running agentic
harnesses, community-favorite agentic tooling, and an SST/opencode deep-dive.

Headline finding: the hermes-agent we pin at 0.18.x appears to be the same Nous
Research project now reported as the fastest-growing agent framework in open
source (60k+ stars in two months) on the strength of persistent multi-tier
memory + a skill-writing learning loop — a pin-audit is Top-5 item 3.

> **CORRECTION 2026-07-09 (OPS-480, source-verified):** the "persistent
> multi-tier memory" claim above does not hold up against
> `hermes_cli/config.py` on `NousResearch/hermes-agent@main` — the built-in
> memory provider is two flat Markdown files (`MEMORY.md`, `USER.md`) with no
> tier granularity, not three tiers. The skill-writing loop is confirmed
> present and on by default at 0.18.0. See
> `packages/harness-hermes/README.md` Verdict section for the full audit.

## 1. Models for the cluster

### Pragmatic — fits gateway upstreams or 32GB local tier now

- **DeepSeek-V4-Pro** — existing Crusoe upstream. 1.6T MoE / 49B active, MIT,
  1M ctx / 384K output. 80.6% SWE-bench Verified, 93.5% LiveCodeBench,
  Codeforces 3206. Best perf-per-inference-cost for self-host per multiple
  write-ups. **Pragmatic, already in production** — watch for V4.x point
  release. [overview](https://deepinfra.com/blog/deepseek-v4-pro-model-overview) ·
  [guide](https://www.aimadetools.com/blog/deepseek-v4-pro-complete-guide/)
- **Qwen3-235B-A22B-Instruct** — existing Crusoe upstream. Apache-2.0, 262K
  ctx. Still competitive; superseded on paper by Qwen3.6 refresh. **Pragmatic,
  keep**; test the 3.6 swap-in when Crusoe lists it.
  [HF card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507)
- **Kimi-K2.6 / K2.7-Code** — K2.7-Code (2026-06-12, Modified MIT, 1T MoE /
  32B active, 256K ctx): +21.8% Kimi Code Bench v2, ~10% gains on
  autonomous-agent benches, ~30% fewer thinking tokens than K2.6. Sibling
  **K2-Thinking** holds tool-call coherence across 200–300 sequential calls
  (93% τ²-Bench Telecom — strongest tool-reliability signal surveyed).
  **Pragmatic — upgrade K2.6→K2.7-Code on the OpenRouter lane.**
  [release](https://www.digitalapplied.com/blog/kimi-k2-7-code-release-open-source-coding-model) ·
  [tool-use](https://lambda.ai/blog/kimi-k2-thinking-outperforms-proprietary-models-with-new-techniques-for-agentic-tool-use)
- **GLM-5.2 (zai)** — 2026-06-13, 744B MoE, MIT, 1M ctx / 131K output.
  SWE-bench Pro 62.1 (> GPT-5.5's 58.6), Terminal-Bench 2.1 81.0, FrontierSWE
  74.4 (within 1pt of Opus 4.8). Zhipu optimizing for long-horizon agentic RL.
  Already a gateway model here (added 2026-07-06) — survey independently
  validates the pick; the 1M-ctx variant lane is the upgrade to watch.
  [guide](https://www.eigent.ai/blog/glm-5-2) ·
  [writeup](https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/)
- **Devstral-Small-2-24B** — existing local tier. 256K ctx, 68% SWE-bench
  Verified, tuned for plan→read→patch→test loops, single-4090-class.
  **Pragmatic, keep** — best sub-30B dedicated coding-loop model. Sibling
  Devstral-2 123B (72.2% SWE-V) if upstream GPU budget ever lands.
  [HF](https://huggingface.co/mistralai/Devstral-Small-2-24B-Instruct-2512) ·
  [paper](https://arxiv.org/abs/2509.25193)
- **Qwen3.6-27B/35B-A3B/9B MTP (local)** — community consensus validates the
  current picks ("strong all-round local model … agentic workflows", usable
  speed on 3090-class). **Keep, no change.**
  [roundup](https://www.kdnuggets.com/top-7-coding-models-you-can-run-locally-in-2026)

### Aspirational

- **DeepSeek-V4-Pro-Max** (reasoning) — 93.5 Pass@1 LiveCodeBench; straight
  upgrade path if Crusoe lists it.
  [guide](https://codersera.com/blog/deepseek-v4-complete-guide-2026/)
- **MiniMax-M2.7** — 230B/10B-active MoE, open-weight 2026-03-18. Vendor
  claims "8% of Sonnet price, 2x speed" (UNVERIFIED — vendor number). #1
  open-weight on at least one leaderboard per press. Cheapest-to-serve shape
  of the frontier trio if numbers hold. **Bench-off before adopting.**
  [GitHub](https://github.com/MiniMax-AI/MiniMax-M2) ·
  [HN](https://news.ycombinator.com/item?id=47737928)
- **Kimi-K2-Thinking standalone** — add purely for very-long tool-call chains
  (200–300 calls) if a workflow needs that profile.
  [analysis](https://www.interconnects.ai/p/kimi-k2-thinking-what-it-means)
- **Qwen3-Coder-480B-A35B** — 69.6% SWE-V, Apache-2.0; needs more GPU, not
  clearly better than GLM-5.2/K2.7 per footprint. Watch only.

### Watch (9–35B local band)

- **granite4** (IBM, Apache-2.0, 3B–32B-A9B) — native function-calling
  training; bench against Qwen3.6-9B-MTP for tool-calling workloads.
- **qwen3-coder:30b** (3.3B active, 256K ctx, ~19GB Q4_K_M) — best
  quality-per-GB per community; overlaps the 35B-A3B pick, low priority.

## 2. Long-running agentic harnesses

- **Hermes Agent (Nous Research, MIT)** — see headline. Three-tier persistent
  memory (semantic/working/episodic), closed learning loop writing reusable
  skills post-task, positioned for "long-term autonomous cloud deployment".
  60k+ stars in two months. **We pin 0.18.x — audit whether the memory/skill
  loop postdates the pin.** [site](https://hermes-agent.org/) ·
  [writeup](https://www.tencentcloud.com/techpedia/143930)
  > **CORRECTION 2026-07-09 (OPS-480, source-verified):** memory is two flat
  > Markdown files (`MEMORY.md` agent notes, `USER.md` user profile) injected
  > into the system prompt, plus an empty-by-default external-provider slot
  > (7 options, none of them Engram) — NOT three-tier semantic/working/
  > episodic; that framing doesn't correspond to any config surface at
  > 0.18.0. Skill-writing loop confirmed present and on by default, with
  > unrestricted writes (`skills.write_approval: false` upstream default).
  > Full audit + Engram-boundary lane decision in
  > `packages/harness-hermes/README.md` Verdict section.
- **OpenClaw** (ex-Moltbot/Clawdbot) — 280k+ stars (reportedly passed React;
  9k→60k in 72h at peak). Local-first gateway, 20+ messaging channels,
  cron/nodes/canvas first-class, 13.7k-skill marketplace, Markdown memory.
  Category: always-on personal agent, not a CI/cluster supervisor — study the
  cron+multi-channel+skill-marketplace pattern for shepherd/omp design.
  Safety caveat: "Mind Your HEARTBEAT" paper on silent memory pollution via
  background execution — read before treating background loops as safe.
  [GitHub](https://github.com/openclaw/openclaw) ·
  [paper](https://arxiv.org/pdf/2603.23064)
- **Claude Code Routines** — cloud-executed scheduled prompts (cron/API/GitHub
  triggers), stateless-per-run doctrine (externalize state), hourly minimum.
  **Lowest-integration-cost option** given Claude-Code-primary daily driving.
  [docs](https://code.claude.com/docs/en/scheduled-tasks) ·
  [practices](https://www.mindstudio.ai/blog/claude-code-cron-jobs-schedule-agents)
- **Cursor background agents** — 8h refactors surviving closed laptops;
  internal Planner→Worker→Judge pattern (recursive subplanners, non-coordinating
  workers, iteration judges) — steal the pattern, can't self-host the product.
  [Willison](https://simonwillison.net/2026/jan/19/scaling-long-running-autonomous-coding/)
- **OpenHands (72.5k stars) vs SWE-agent (19.1k)** — one-shot coding-agent
  scaffolds, category peers of pi/opencode, not fleet supervisors. **Watch,
  not adopt**; OpenHands' RBAC/audit-trail enterprise mode is the one pattern
  worth studying if multi-agent delegation formalizes.
  [comparison](https://localaimaster.com/blog/openhands-vs-swe-agent)

## 3. Community darlings

- **Orchestration**: LangGraph overtook CrewAI (graph state → audit/rollback);
  Claude Agent SDK passed AutoGen on enterprise production telemetry;
  MS Agent Framework consolidates AutoGen+SK. **Watch, low priority** — solves
  business-process orchestration we haven't needed.
  [roundup](https://www.langchain.com/resources/ai-agent-frameworks)
- **Memory**: Mem0 (bolt-on, low lock-in) vs Letta (agent-runtime, Core/Recall/
  Archival tiers, 2026 production default). Neither displaces Engram; Letta's
  tier model is the reference architecture if Engram tiering reworks.
  [comparison](https://vectorize.io/articles/mem0-vs-letta)
- **Eval**: Inspect AI confirmed as bench anchor (already our call, PR #11);
  DeepEval (15.7k stars, pytest-native) the CI-ergonomic darling. **Watch
  DeepEval for CI-integrated eval.**
  [overview](https://deepeval.com/blog/what-is-an-eval-harness)
- **MCP**: registries fragmented (official ~9.6k, PulseMCP ~15.9k, Smithery
  ~7.3k). **Cloudflare "Code Mode"** (dynamic tool discovery, claims 98%+
  token savings) directly compounds our harness-omp slim-profile work
  (39k→12k) — **pragmatic to investigate.**
  [state](https://chatforest.com/guides/mcp-ecosystem-2026-state-of-the-standard/)
- **Gateways**: "self-host? yes → LiteLLM" per 2026 decision framework —
  llm.unsigned.gg validated; virtual-key budgets called out as the standout
  feature (matches OPS-465 direction). Portkey now Apache-2.0 — guardrails/PII/
  jailbreak layer to evaluate IN FRONT of LiteLLM, not a replacement.
  [comparison](https://www.requesty.ai/blog/litellm-vs-portkey-vs-openrouter-best-llm-gateway-2026)
- **Sandboxing**: Cloudflare Sandboxes (sub-50ms cold start, 30-min cap) fit
  short agent code-exec given existing CF footprint; E2B (Firecracker, 24h)
  when longer/harder isolation is needed.
  [comparison](https://northflank.com/blog/e2b-vs-modal) ·
  [4-way](https://mcp.directory/blog/cloudflare-sandbox-vs-modal-vs-e2b-vs-daytona-2026)

## 4. SST / opencode deep-dive — is the anomaly durable?

(Researcher note: a "$420M Series D" figure surfacing in search is satire from
parody outlet crunch.fyi — excluded; real figures are YC seed, $1.63M total.)

- **What SST is**: TypeScript IaC framework for AWS (Frank Wang, Jay V; company
  now branded "Anomaly", anomalyco on GitHub — the operator's hypothesis is
  literally their company name). YC 2021, $1M seed, $1.63M total; bootstrap-
  profitable pre-opencode. SST v3 "Ion" now third-party-described as
  maintenance mode — attention moved to opencode.
  [YC profile](https://www.ycombinator.com/companies/sst) ·
  [maintenance-mode note](https://northflank.com/blog/sst-alternatives-serverless-stack)
- **Team vs output — the actual anomaly**: SIX people run opencode at
  150-180k stars, 6.5-8M monthly active devs, 900 contributors, ~14.4k
  commits, 827 releases in ~1 year (multiple releases/day the norm).
  [Pragmatic Engineer profile](https://newsletter.pragmaticengineer.com/p/opencode) ·
  [dev guide](https://www.developersdigest.tech/blog/opencode-developer-guide-2026)
- **Strategy**: positional, per Dax Raad — every category-leading dev tool has
  been open source; no AI coding agent held that position going into 2025, so
  a small cohesive team rushed the undefended category.
  [Baseten interview](https://www.baseten.co/blog/building-ai-agents-open-code-and-open-source-a-conversation-with-dax/)
- **Monetization**: core MIT free · Go $10/mo curated OSS models · Zen
  pay-as-you-go at ZERO markup (several $M annualized already) · Black
  flat-rate enterprise, currently CLOSED to signups (deliberate gating or
  6-person capacity ceiling — indistinguishable from outside).
  [Zen docs](https://opencode.ai/docs/zen/)
- **Fit for us**: provider-agnostic (75+ providers) matches the LiteLLM-
  gateway architecture better than any single-vendor tool; distinct category
  from Claude Code (integrated daily driver, 91% CSAT / NPS 54 per JetBrains
  survey) — complements, not substitutes, exactly as the monorepo treats them.
  [JetBrains survey](https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/)
- **Verdict — durable for now, one named risk**: this team has ALREADY
  redirected away from a successful project once (SST Ion → maintenance mode).
  The trait that produced opencode's rise — chase the undefended category —
  could produce the next pivot. Compounding: 6-person bus factor at 8M-MAU
  scale; Black-closed as a possible stretched-team signal. Counter-signals:
  real zero-markup revenue, open thesis, sustained (not launch-spike) cadence.
- **Pin recommendation**: keep opencode in the curated four; keep PR-per-bump
  discipline (don't relax at this cadence, don't track latest); add an
  abstraction seam before building opencode-specific automation (their
  redirect pattern is demonstrated, not hypothetical); watch Black
  reopening + headcount as the flywheel-reinvestment indicator, and treat a
  sharp cadence drop as a vendor-risk signal.

## Top-5 act-on shortlist (researcher's, annotated with our state)

1. ~~Add GLM-5.2 as gateway upstream~~ — ALREADY DONE here (2026-07-06);
   survey validates. Remaining upside: the 1M-ctx lane.
2. **Upgrade Kimi-K2.6 → K2.7-Code on the OpenRouter lane** — quality +
   ~30% thinking-token efficiency at existing spend.
3. **Audit hermes-agent 0.18.x pin vs upstream memory/skill-loop features** —
   deliberate-bump review per repo charter.
4. **Evaluate Cloudflare Code Mode for harness-omp context profiles** —
   compounds the 39k→12k slim-profile work on MCP-heavy configs.
5. **Bench MiniMax-M2.7 vs GLM-5.2 vs K2.7-Code** before any adoption —
   vendor numbers unverified.
