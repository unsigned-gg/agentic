# context — estate orientation, authored once

Single source of truth for the user-scope context that orients every agent
harness on this machine to the estate (clusters, repos, SOPs, memory of
record, secrets model).

| Source | Rendered to | Mechanism |
|---|---|---|
| `omp-prelude.md` + `estate.md` | `~/.omp/agent/AGENTS.md` | omp native user context (priority 100 — intentionally shadows `~/.claude/CLAUDE.md`, which is Claude-specific) |
| `invariants.md` | `~/.omp/agent/RULES.md` | omp sticky rule — re-attached near the current turn, survives long sessions and compaction |
| `estate.md` | `~/.agents/estate.md` | imported by `~/.claude/CLAUDE.md` via `@~/.agents/estate.md` (render.sh verifies the import line, never writes that file) |

Run `bash render.sh` after editing sources (or `moon run context:render`).
Rendered files are generated copies — never hand-edit them.

Budget: `estate.md` is gated at ~2400 estimated tokens because it is injected
into every session of every harness. Add pointers, not prose; live state
belongs in the `estate-orient` skill (`packages/skills/estate-orient/`), not
here.
