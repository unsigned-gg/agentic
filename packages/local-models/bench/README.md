<!-- lineage
role: reference
conforms_to: ../../../README.md
consumes: ../MODELS.md (source of truth for local rows)
-->

# bench.unsigned.gg

Static Cloudflare Worker serving the model-benchmark dashboards. Two pages, one
growing pile of numbers:

- **`/`** (`public/index.html`) — the **local bank**: decode speed + MTP
  speculative-decoding gains, measured on the RTX 5090. Source of truth is
  `../MODELS.md`.
- **`/frontier.html`** — the **frontier leaderboard**: the models we *can't* run
  at home (Fugu, Opus, Gemini, GPT). Data-driven, humor included, provenance
  optional.

## The "benchmark repo" — `public/data/`

Numbers live as JSON so adding a benchmark is a data edit, not an HTML surgery.
They sit under `public/` because only the assets root is served — the pages
`fetch()` them at load.

| File | What it holds | Schema |
|---|---|---|
| `public/data/frontier.json` | frontier leaderboard | `{ snapshot, source, provenance, higher_is_better, models[], benchmarks[] }` — each benchmark is `{ name, scores[] }`, `scores` aligned to `models` order |
| `public/data/candidates.json` | models awaiting a run | `{ note, candidates[] }` — each is `{ name, repo, rev, params, context, license, status, quip }` |

Winners and runners-up are computed in the page (max = 👑 gold, next distinct =
underline), so you never hand-mark a cell — just drop in the row and let the
math embarrass whoever earned it.

### Adding a frontier benchmark

Append one object to `benchmarks` in `public/data/frontier.json`, `scores` in the same
order as `models`. Higher-is-better is assumed. That's it — the table, the
per-model win tally, and the stat tiles all recompute on load.

### Promoting a candidate

When the 5090 finally has an opinion, move the row from `candidates.json` into
`../MODELS.md`'s banked table (and mirror the GGUF). The bench is for loitering;
`MODELS.md` is for the verified.

## Deploy

Pinned wrangler `4.107.0`. Custom domain route `bench.unsigned.gg`.

```bash
pnpm --dir packages/local-models/bench deploy   # wrangler deploy
```

Local preview:

```bash
pnpm --dir packages/local-models/bench dlx wrangler@4.107.0 dev
```

## House rules

- **Data over markup.** New numbers go in `public/data/*.json`, not into a `<td>`.
- **Humor is allowed; lying is not.** Snark about a score all you want — the
  score itself stays honest, and unverified provenance gets *labeled* unverified
  (see the Fugu disclaimer), not laundered into fact.
