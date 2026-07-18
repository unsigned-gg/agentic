<!-- lineage
role: package-readme
conforms_to: ../../README.md
consumes: harness-{pi,omp,opencode,hermes} config presets (read-only)
-->

# presets-parity

CI drift gate for the four hand-maintained gateway (`llm`) model lists:

- `harness-pi/config/models.json` — `providers.llm.models[].id`
- `harness-omp/config/models.yml` — `providers.llm.models[].id`
- `harness-opencode/config/opencode.json` — `provider.llm.models{}` keys
- `harness-hermes/config/cli-config.local-endpoint.yaml` — `providers.llm.models[]`

Nothing auto-mirrors the gateway's `/v1/models`; every model add/remove is a
hand edit ×4. Before this gate, drift was undetectable in CI (found in the
2026-07-08 recon). The test asserts the four model-ID sets are identical —
change one file, change them all in the same PR.

`PARITY_LIVE=1 UNSIGNED_LLM_API_KEY=… bun test` adds a network check that the
live gateway serves every preset model (presets must never list a model the
gateway lacks; the gateway MAY serve more). Not gated on PRs — instead it runs
on a weekly schedule (`.github/workflows/parity-live.yml`, Mon 06:17 UTC +
`workflow_dispatch`) against the `UNSIGNED_LLM_API_KEY` repo Actions secret
(gateway virtual key; 1P item `unsigned-llm` — never committed). A red
scheduled run means the gateway catalog drifted from the presets (OPS-729).

The live run also compares preset `contextWindow`s against the gateway's
`/v1/model/info` metadata (OPS-732): mismatches are **warned**, not failed,
while `max_input_tokens` coverage is sparse. Once the LiteLLM config carries
metadata for the full catalog (paas-side half of OPS-732), promote the
warning to an assertion.

## Verified

- `bun test` green on the current 13-model set; goes red with a named-file
  diff when any single preset is mutated (exercised during development).
