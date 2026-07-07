#!/usr/bin/env bash
# Install oh-my-pi (omp) at the repo's curated pin.
# Idempotent. Upstream's front door is a remote install script — banned here;
# bun-native install from npm instead (same package the installer resolves to).
set -euo pipefail

OMP_VERSION="16.3.11"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v bun >/dev/null 2>&1 || { echo "bun not found — run scripts/bootstrap.sh first (proto provides bun)" >&2; exit 1; }

bun install -g "@oh-my-pi/pi-coding-agent@${OMP_VERSION}"

if command -v omp >/dev/null 2>&1; then
  omp --version
else
  echo "omp installed but not on PATH — add bun's global bin dir (bun pm bin -g) to PATH" >&2
fi

# Config preset: omp keeps user config under ~/.omp/agent (it also co-reads
# .claude/.codex/.gemini trees, but NOT ~/.pi — presets are not shared with
# harness-pi). Seed models.yml only if absent — live config is never clobbered.
mkdir -p "${HOME}/.omp/agent"
if [ ! -f "${HOME}/.omp/agent/models.yml" ]; then
  cp "${PKG_DIR}/config/models.yml" "${HOME}/.omp/agent/models.yml"
  echo "installed local-endpoint preset -> ~/.omp/agent/models.yml"
else
  echo "${HOME}/.omp/agent/models.yml exists — NOT overwritten. Presets: ${PKG_DIR}/config/"
fi
echo "oh-my-pi ${OMP_VERSION} ready"
