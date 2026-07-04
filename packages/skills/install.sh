#!/usr/bin/env bash
# Symlink every skill dir in this package into each harness's skills location.
# Idempotent; symlinks mean edits here are live everywhere at once.
#
# Targets (agentskills.io consumers):
#   pi          ~/.pi/agent/skills/
#   opencode    ~/.config/opencode/skills/
#   hermes      ~/.hermes/skills/
#   agents-std  ~/.agents/skills/        (Claude Code + anything reading the
#                                         cross-harness convention dir)
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGETS=(
  "${HOME}/.pi/agent/skills"
  "${HOME}/.config/opencode/skills"
  "${HOME}/.hermes/skills"
  "${HOME}/.agents/skills"
)

linked=0
for target in "${TARGETS[@]}"; do
  mkdir -p "$target"
  for skill in "${PKG_DIR}"/*/; do
    name="$(basename "$skill")"
    [ -f "${skill}SKILL.md" ] || continue   # only real skills (frontmatter file present)
    ln -sfn "${skill%/}" "${target}/${name}"
    linked=$((linked + 1))
  done
done
echo "skills linked: ${linked} links across ${#TARGETS[@]} harness dirs"
