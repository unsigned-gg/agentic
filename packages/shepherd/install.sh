#!/usr/bin/env bash
# Install shepherd (shepherd-agents/shepherd) at the repo's curated pin.
# Idempotent. uv-native install from PyPI — never pipe remote scripts to a shell.
set -euo pipefail

SHEPHERD_VERSION="0.2.1"

command -v uv >/dev/null 2>&1 || { echo "uv not found — run scripts/bootstrap.sh first (proto provides uv)" >&2; exit 1; }

uv tool install --force "shepherd-ai==${SHEPHERD_VERSION}"
shepherd --version

# No config preset: shepherd keeps no user-level config. State is
# per-workspace (.vcscore/, created by `shepherd init`); the agent lane
# rides the claude CLI's own credentials.
echo "shepherd ${SHEPHERD_VERSION} ready"
echo "next: in a repo, 'shepherd init' then 'shepherd doctor claude' (add --probe for a live auth round-trip)"
