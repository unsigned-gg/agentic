<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: local-models/README.md (endpoint wiring)
-->

# harness-pi

[pi.dev](https://pi.dev) (`badlogic/pi-mono`) at curated pin
**`@earendil-works/pi-coding-agent` 0.80.3**.

```bash
./install.sh   # npm install -g at the pin, presets + extensions symlinked
```

## What you get

- **`config/models.json`** → `~/.pi/agent/models.json` (only if absent — live
  config is never clobbered): three OpenAI-compatible local providers —
  `ollama` (:11434), `llamacpp` (:8080), `vllm` (:8000). Model ids are
  placeholders; align them with what you actually serve
  (`packages/local-models/MODELS.md`).
- **`extensions/local-model-switch.ts`** → symlinked into
  `~/.pi/agent/extensions/` (auto-discovered, `/reload`-able). Adds `/local`:
  probes the three local endpoints and switches to the first live one.
- Type-checked against the pinned pi package (`pnpm build` runs `tsc --noEmit`).

## Extension development

Extensions are TS modules default-exporting `(pi: ExtensionAPI) => void`;
register tools (`pi.registerTool`, typebox params), commands
(`pi.registerCommand`), and event hooks (`pi.on("tool_call", ...)` can block or
rewrite calls — that's the permission-gate pattern). Upstream reference:
`pi-mono/packages/coding-agent/docs/extensions.md`. Iterate with
`pi -e ./extensions/foo.ts`, promote by adding to this dir and re-running
`install.sh`.

## SDK note

For embedding the agent loop in your own app (not just configuring the CLI):
`createAgentSession()` from the same package — see upstream
`docs/` for `AgentSessionRuntime`. That's a future package here (evals/bench),
not this one.

## Verified

- `tsc --noEmit` against pinned deps — CI-gated.
- The `ctx.modelRegistry`/`ctx.setModel` call shapes in the extension follow
  upstream docs/extensions.md prose; typecheck against the pinned package is
  the enforcement. Live `/local` behavior: exercise after install
  (`pi` → `/local` with no server running should warn, not switch).
