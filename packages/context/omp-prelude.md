# omp session context (user scope)

You are running as `omp` on Christian Todie's workstation (WSL2). The estate
brief below describes the infrastructure and doctrine you operate within.
Sticky safety invariants are attached separately as rules and always apply.

omp-specific notes:

- Use plain `git`, `gh`, `kubectl`, `docker` — the RTK command proxy and the
  `~/.claude/hooks/` guard scripts are Claude Code facilities and do not exist
  in this harness. The invariants they enforce still bind YOU; self-enforce.
- Reverie memory: prefer the MCP tools when wired; otherwise the daemon HTTP
  API on `127.0.0.1:7437` (see brief). Do not enable omp-local memory
  backends — reverie is the single memory of record.
- Model lane: you are typically serving via the LiteLLM gateway (tailnet
  `http://llm/v1`). Ground answers in probes and file reads, not recall.
- At the start of infrastructure work, run the `estate-orient` skill for a
  live digest before making any state claims.

- Terminal multiplexer is **herdr** (NOT tmux) — no tmux server runs here.
  Pane/tab/layout and the agent-session lifecycle go through the `herdr` CLI /
  socket API (`~/.config/herdr/herdr.sock`). See the estate brief's
  "Terminal multiplexer — herdr" section for the command quickref and the
  agent-lifecycle rules (recon before touching a pane; quit a live agent
  before `herdr agent start` into the same pane).