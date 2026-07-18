#!/usr/bin/env bash
# Re-pin Python 3.12 for the voicemode Claude Code plugin after a plugin
# update. Symptom: /mcp shows voicemode failed with -32000; root cause:
# `uv run voicemode` resolves under Python 3.14, where pydantic-core has no
# prebuilt wheel and the maturin source build fails.
set -euo pipefail

for dir in "$HOME"/.claude/plugins/cache/voicemode/voicemode/*/; do
  [ -f "$dir/pyproject.toml" ] || continue
  echo "3.12" > "$dir/.python-version"
  echo "pinned python 3.12 in $dir"
done
