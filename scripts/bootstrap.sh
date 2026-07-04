#!/usr/bin/env bash
# Idempotent agentic setup (terrarium-federated). Safe to re-run.
# Prereq: install proto once via the official installer (https://moonrepo.dev/proto)
# — we deliberately do NOT pipe a remote script to a shell here.
set -euo pipefail

if ! command -v proto >/dev/null 2>&1; then
  echo "proto not found — install it once from https://moonrepo.dev/proto, then re-run." >&2
  exit 1
fi

proto install   # all toolchains pinned in .prototools (node·pnpm·python·uv·moon)
moon setup      # install moon toolchains + validate .moon/* config

# Git hooks via lefthook (local-only guardrails). proto can't manage lefthook —
# it's not a language runtime — so install it once out-of-band (e.g.
# `go install github.com/evilmartians/lefthook@latest`, or your package manager),
# then re-run. We do NOT hard-fail bootstrap on it: CI + the .claude hooks are the
# enforced gates; lefthook only mirrors them locally for fast feedback.
if command -v lefthook >/dev/null 2>&1; then
  lefthook install   # wire .git/hooks
else
  echo "note: lefthook not found — local git hooks not wired. Install lefthook then run 'lefthook install'. (CI + .claude hooks still enforce.)" >&2
fi

echo "agentic ready — moon $(moon --version 2>/dev/null | awk '{print $2}')"
