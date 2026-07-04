#!/usr/bin/env bash
# Install hermes-agent (Nous Research) at the repo's curated pin.
# Idempotent. Upstream's front door is curl|bash — banned here; uv-native
# install from PyPI instead (same package the installer script resolves to).
set -euo pipefail

HERMES_VERSION="0.18.0"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v uv >/dev/null 2>&1 || { echo "uv not found — run scripts/bootstrap.sh first (proto provides uv)" >&2; exit 1; }

uv tool install --force "hermes-agent[anthropic]==${HERMES_VERSION}"
hermes --version

# Config preset: hermes keeps config under ~/.hermes; seed cli-config.yaml
# only if absent — live config is never clobbered.
mkdir -p "${HOME}/.hermes"
if [ ! -f "${HOME}/.hermes/cli-config.yaml" ]; then
  cp "${PKG_DIR}/config/cli-config.local-endpoint.yaml" "${HOME}/.hermes/cli-config.yaml"
  echo "installed local-endpoint preset -> ~/.hermes/cli-config.yaml"
  echo "run 'hermes setup' to complete provider auth interactively"
else
  echo "${HOME}/.hermes/cli-config.yaml exists — NOT overwritten. Presets: ${PKG_DIR}/config/"
fi
echo "hermes-agent ${HERMES_VERSION} ready"
