#!/usr/bin/env bash
# Install pi (pi.dev coding agent) at the repo's curated pin + wire this
# package's presets. Idempotent. No curl|bash — npm-native install only.
set -euo pipefail

PI_VERSION="0.80.10"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v npm >/dev/null 2>&1 || { echo "npm not found — run scripts/bootstrap.sh first (proto provides node)" >&2; exit 1; }

npm install -g "@earendil-works/pi-coding-agent@${PI_VERSION}"
pi --version

# Config presets: copy models.json if absent; never clobber live config.
mkdir -p "${HOME}/.pi/agent/extensions"
if [ ! -f "${HOME}/.pi/agent/models.json" ]; then
  cp "${PKG_DIR}/config/models.json" "${HOME}/.pi/agent/models.json"
  echo "installed models.json (local-endpoint providers) -> ~/.pi/agent/models.json"
else
  echo "${HOME}/.pi/agent/models.json exists — NOT overwritten. Merge providers from ${PKG_DIR}/config/models.json manually."
fi

# Extensions: symlink (auto-discovered + hot-reloadable via /reload).
for ext in "${PKG_DIR}"/extensions/*.ts; do
  [ -e "$ext" ] || continue
  ln -sfn "$ext" "${HOME}/.pi/agent/extensions/$(basename "$ext")"
done
echo "pi ${PI_VERSION} ready — extensions symlinked from ${PKG_DIR}/extensions"
