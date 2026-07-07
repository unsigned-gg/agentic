#!/usr/bin/env bash
# Thin wrapper: measure omp's request-context footprint. Not CI-gated (needs
# omp installed) — run on pin bumps to catch upstream context bloat.
# Usage: measure-context.sh [--budget N] [--settings <config.yml>|default]
set -euo pipefail
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 "${PKG_DIR}/tools/measure-context.py" "$@"
