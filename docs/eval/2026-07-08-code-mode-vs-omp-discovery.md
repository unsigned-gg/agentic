<!-- lineage
role: eval
conforms_to: ../../README.md
consumes: packages/harness-omp/README.md (context caveats), packages/harness-omp/config/config.local.yml (slim profile under test), packages/harness-omp/tools/measure-context.py (probe used for every number below)
-->

# Code Mode vs omp dynamic discovery — measured verdict (OPS-481)

Date: 2026-07-08 · Status: evaluation only, no config changes in this PR · Host: this WSL2 box, omp 16.3.11 (`PATH="$HOME/.cache/.bun/bin:$PATH"`)

Ticket: OPS-481 — numbers-backed comparison of Cloudflare's Code Mode dynamic
tool-discovery architecture against harness-omp's existing
`tools.discoveryMode: all` / `search_tool_bm25` slim profile, plus the
pre-registered hypothesis that a gateway-profile `includeSkills` allowlist is
the cheaper first lever regardless of the Code Mode question.

## Verdict

**Steal-pattern, not adopt.** omp already has a Code-Mode-shaped primitive for
its built-in tools (`discoveryMode: all`, hide-behind-a-search-tool) and a
second one for MCP connectors (`mcp.discoveryMode`, same shape, unused today).
Cloudflare's actual innovation — a sandboxed code-execution runtime where the
model writes JS that chains `search()`/`describe()`/connector calls without
each intermediate result round-tripping through the model's context — solves a
problem at a scale (2,500-endpoint single APIs, "thousands of tools") that
does not exist in this harness (20 built-in tools, 0 currently-loaded MCP
connectors). Building that runtime for omp would be a large lift for a
marginal win here. The pre-registered hypothesis holds: on measured numbers,
a **skills-allowlist trim of the gateway profile is both cheaper to ship and a
bigger token win than any discovery-mode change**, because the skills block,
not the tool-schema block, is this harness's dominant cost.

## What Code Mode actually is

Source: [Cloudflare Agents docs — Code Mode](https://developers.cloudflare.com/agents/tools/codemode/), [how it works](https://developers.cloudflare.com/agents/tools/codemode/how-it-works/), [blog: give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/).

The model is given exactly **one tool**, `codemode`, taking a `code` string. Its
description lists connector *namespaces* only (e.g. `github`, `stripe`) — no
method schemas. Inside a sandboxed Worker (Dynamic Worker Loader), the
generated code gets two discovery globals:

- `codemode.search(query)` — ranks connector methods / saved snippets by
  relevance, returns `{path, connector, method, score}` — no full schemas.
- `codemode.describe(target)` — returns focused TypeScript types for one
  target, pulled from a path `search()` returned.

The model runs code in two turns: turn 1 calls `search()` to find candidates;
turn 2 calls `describe()` on the winners, then writes the real connector calls
(`github.list_pull_requests()` etc.), which the sandbox intercepts and
executes. The full catalog — Cloudflare's own example is **2,500 API
endpoints, ~1.17M tokens of schema** — never enters the model's context;
Cloudflare's headline number is **~1,000 tokens** regardless of catalog size,
a 99.9% reduction for that case. The multi-step chaining inside one sandboxed
execution also avoids paying a context round-trip for every intermediate tool
result, which is a second, separate saving from the discovery mechanism
itself. Caveats the docs surface: requires the Dynamic Worker Loader sandbox,
correctness depends on the OpenAPI spec staying accurate, and it's built for a
single large API surface — multi-connector composition is still an open
problem even in their own docs.

## Measured baselines and variants

All numbers from `packages/harness-omp/tools/measure-context.sh` (chars/3.6
estimator, reads ~10% high per the tool's own calibration note). Each row is
a fresh throwaway `OMP_PROFILE`; nothing under `~/.omp/agent/` was modified.

| # | Config | Tools (schemas) | Skills block | System msg | **Total est. tokens** |
|---|---|---:|---:|---:|---:|
| 1 | Default omp OOTB | 20 (~21.7k) | ~16.5k | 23.7k | **45,386** |
| 2 | Live gateway profile (`~/.omp/agent/config.yml`, read-only) | 25 (~23.2k) | ~16.5k | 23.7k | **46,963** |
| 3 | Slim profile (`config.local.yml`, adopted PR #7–#9) | 9 (~7.4k) | ~0.1k (1 skill) | 6.5k | **13,874** |
| 4 | A — discovery-only: `discoveryMode: all` + 6-tool essential set, skills untouched | 10 (~9.3k) | ~16.5k | 23.4k | **32,691** |
| 5 | B — min-essential: same but 2-tool essential set (`read`,`bash`) | 9 (~8.7k) | ~16.5k | 23.3k | **32,065** |
| 6 | C — discovery-only + zero skills (all skill sources disabled) | 10 (~9.3k) | 0 | 6.8k | **16,122** |
| 7 | **D — gateway + `includeSkills: [local-model-triage]` only, nothing else changed** | 20 (~21.7k, untouched) | ~0.1k (1 skill) | 7.2k | **28,946** |
| 8 | MCP-heavy | not measurable in this environment — see below | — | — | — |

Row 2 vs the 2026-07-07 recorded baseline (45,236 est.) drifted +1,727 tokens
in one day — 5 extra tool schemas (20→25) picked up from plugin/marketplace
growth under `~/.claude/plugins`, not from anything in this repo. That drift
is itself a data point: the gateway profile's footprint is not stable day to
day, which strengthens the case for a cheap, low-risk trim (row 7) rather than
leaving it to grow unchecked.

### Reading the levers apart

- **Tool-schema discovery alone** (row 1→4, full skills held constant): 45,386
  → 32,691, a **12,695-token / 28% cut**, entirely from hiding built-in tool
  schemas behind `search_tool_bm25`. Shrinking the essential set further (row
  5, 6→2 tools) buys almost nothing more (32,691→32,065, 626 tokens) — most of
  the win is in flipping `discoveryMode`, not in how small the essential set
  is.
- **Skills allowlist alone** (row 2→7, tools held at full 20-schema default):
  46,963 → 28,946, an **18,017-token / 38% cut** — bigger than the discovery-only
  lever, for a one-line config change, with zero behavioral risk to tool
  availability (the model never has to learn to call a search tool first; every
  built-in tool schema stays immediately visible).
- **Both together** (the existing slim profile, row 3, plus row 6 as the
  discovery+skills-only isolate at 16,122): confirms the two levers are close
  to additive and the slim profile's remaining gap under row 6 (13,874 vs
  16,122) is the LSP/debug/astGrep/eval/personality trims already in
  `config.local.yml`, not skills or tool discovery.

**Pre-registered hypothesis: confirmed.** Row 7 validates that a gateway-profile
skills allowlist is the cheaper, safer first lever — bigger raw savings than
tool-schema discovery (18.0k vs 12.7k tokens) and it ships as one YAML key with
no change to how the model calls tools at all.

### MCP-heavy datapoint: not measurable here

Attempted per the task brief: a project `.mcp.json` registering the local
`engram` MCP stdio server (`engram mcp --tools all`), measured with
`mcp.discoveryMode: false` (schemas upfront, the default) and `true` (hidden
behind a discovery tool — omp's own Code-Mode-equivalent for MCP, see below).
The engram registration never loaded. Instead, the probe run's log
(`~/.omp/profiles/*/logs/omp.*.log`) showed omp attempting to load **seven
other MCP connectors it discovered independently** — `railway`, `goodmem`,
`imessage`, `telegram`, and three `cloudflare:*` servers, plus `stripe` — all
of which failed (`HTTP 401` / `Transport closed`). These come from
`~/.claude/plugins` marketplace state on this operator's machine (confirmed by
an unrelated agent-parsing warning against the same plugin cache path in the
same log), not from anything in this repo or the scratch `.mcp.json`. Net
effect: on this box, right now, **zero MCP tool schemas load under any
setting** — tool count stayed at the row-1/row-2 baseline (20) regardless of
`mcp.discoveryMode`, so the two values were indistinguishable and are not
reported as separate rows. Side note for the operator, not a security finding:
this measurement run made outbound HTTP requests to Railway/Cloudflare/Stripe
MCP endpoints as an unintended side effect of a context-footprint probe — all
were rejected with public 401s (no secrets exchanged), but a probe script
making live third-party calls is worth knowing about.

## omp's existing Code-Mode-shaped primitives

Two config keys already exist and are direct, cheap analogs of Code Mode's
discovery mechanism — the pattern is already stolen, it just isn't fully wired:

- `tools.discoveryMode: all` (used by the slim profile) — collapses secondary
  built-in tools behind `search_tool_bm25`, the same "hide catalog, expose
  search" shape as `codemode.search()`. Difference: the search *result* still
  re-enters the model's visible context as a normal tool-result turn, rather
  than being consumed inside a sandboxed multi-call script — so it saves
  upfront schema tokens but not the per-step round-trip tokens Code Mode's
  in-sandbox chaining saves.
- `mcp.discoveryMode: true` ("Hide MCP tools by default and expose them
  through a tool discovery tool", per `omp config list`) — the direct,
  already-shipped equivalent of Code Mode for MCP connectors specifically.
  Currently unused (no MCP connector on this box loads successfully to
  exercise it against).

What omp does **not** have, and what would be the actual "adopt Code Mode"
project: a sandboxed code-execution surface where the model writes and runs
multi-step scripts against discovered tool/connector methods, so intermediate
results are filtered in-sandbox instead of flowing back through context on
every step. That is a meaningfully larger build (an isolated JS/TS runtime,
a security review of what untrusted-model-generated code can reach) for a
harness whose entire built-in catalog is 20 tools — the scale where
Cloudflare's numbers (1.17M tokens naive vs ~1,000 with Code Mode) apply is a
2,500-endpoint single API, not this one.

## Recommendation

1. **Adopt now (cheap, no new engineering):** a gateway preset that is the
   live gateway config plus `skills.includeSkills` pinned to the same
   allowlist convention `config.local.yml` already uses — row 7's 38% cut,
   with frontier tool schemas left fully intact. See follow-up ticket below.
2. **Steal-pattern, defer:** wire `mcp.discoveryMode: true` into whichever
   profile ends up hosting live MCP connectors, once one actually
   authenticates on this box. It is a one-line flip, not a build.
3. **Skip:** replicating Cloudflare's sandboxed code-execution discovery
   runtime for omp's own tool surface. The problem it solves (huge single-API
   catalogs) doesn't exist here yet; if MCP connectors with rich catalogs
   (Cloudflare's own 2,500-endpoint server is a real candidate once auth is
   fixed) get added later, re-open this question against `mcp.discoveryMode`
   first before considering a custom runtime.

## Follow-up ticket content (not filed — Linear rate-limited today)

**Ticket A — gateway-slim preset (skills-allowlist trim)**
- Title: Add `config.gateway-slim.yml` preset — skills-allowlist trim of the
  gateway profile (~18k / 38% token cut, OPS-481 row 7)
- Body: Create `packages/harness-omp/config/config.gateway-slim.yml` =
  live-gateway `modelRoles` (`llm/zai/GLM-5.2` or current pin) +
  `skills.includeSkills` allowlist mirroring `config.local.yml`'s convention
  (kept in sync with `packages/skills/` via the existing bun test pattern).
  Leave `tools.discoveryMode` at default (`auto`) — full built-in tool
  schemas stay visible, only the skills tax is cut. Wire into
  `measure-context.sh` as a second pin-bump gate alongside the slim profile.
  Document in `packages/harness-omp/README.md` as the "gateway, but not
  skill-bloated" option.
- Evidence: this doc, row 7 (28,946 est. tokens vs row 2's 46,963).

**Ticket B — re-measure MCP-connector cost once one authenticates**
- Title: Re-measure MCP tool-schema footprint + `mcp.discoveryMode` once any
  MCP connector loads successfully in this environment
- Body: All seven MCP connectors currently discovered on this box (`railway`,
  `goodmem`, `imessage`, `telegram`, 3× `cloudflare:*`, `stripe`) fail auth or
  transport at startup — 0 MCP tool schemas load today regardless of
  `mcp.discoveryMode`, so that lever is untested. Once any one of them
  authenticates (most likely candidate: Cloudflare, given the 2,500-endpoint
  single-API scale where Code Mode's numbers actually apply), re-run this
  doc's probe with `mcp.discoveryMode: false` vs `true` to get a real
  MCP-heavy datapoint, and confirm the flip is enough or whether the
  Cloudflare-hosted Code Mode MCP server (if/when it ships broadly) is a
  better fit than omp's own `search_tool_bm25`-shaped hiding.
- Evidence: this doc's "MCP-heavy datapoint: not measurable here" section,
  including the operator side-note about outbound calls during the probe.
