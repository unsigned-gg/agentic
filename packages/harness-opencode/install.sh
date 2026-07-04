#!/usr/bin/env bash
# Install opencode at the repo's curated pin + wire this package's presets.
# Idempotent. No curl|bash — npm-native install only (upstream also offers an
# install script; we deliberately use the npm path).
set -euo pipefail

OPENCODE_VERSION="1.17.13"
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v npm >/dev/null 2>&1 || { echo "npm not found — run scripts/bootstrap.sh first (proto provides node)" >&2; exit 1; }

npm install -g "opencode-ai@${OPENCODE_VERSION}"
opencode --version

# Global config preset: copy if absent; never clobber live config.
CFG_DIR="${HOME}/.config/opencode"
mkdir -p "${CFG_DIR}/plugins"
if [ ! -f "${CFG_DIR}/opencode.json" ]; then
  cp "${PKG_DIR}/config/opencode.json" "${CFG_DIR}/opencode.json"
  echo "installed opencode.json preset -> ${CFG_DIR}/opencode.json"
else
  echo "${CFG_DIR}/opencode.json exists — NOT overwritten. Merge from ${PKG_DIR}/config/opencode.json manually."
fi

# Plugins: symlink for live editing.
for plugin in "${PKG_DIR}"/plugins/*.ts; do
  [ -e "$plugin" ] || continue
  ln -sfn "$plugin" "${CFG_DIR}/plugins/$(basename "$plugin")"
done
echo "opencode ${OPENCODE_VERSION} ready — plugins symlinked from ${PKG_DIR}/plugins"
