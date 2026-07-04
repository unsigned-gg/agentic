#!/usr/bin/env bash
# Format the edited file by type. Always exit 0 (advisory). Bypass: TERRARIUM_SKIP_LINT=1.
[ "${TERRARIUM_SKIP_LINT:-}" = "1" ] && exit 0
input=$(cat); f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // ""')
[ -f "$f" ] || exit 0
case "$f" in
  *.rs) command -v cargo >/dev/null 2>&1 && cargo fmt -- "$f" 2>/dev/null ;;
  *.go) command -v gofmt >/dev/null 2>&1 && gofmt -w "$f" 2>/dev/null ;;
  *.py) command -v ruff  >/dev/null 2>&1 && ruff format "$f" 2>/dev/null ;;
  *.ts|*.tsx|*.js) command -v pnpm >/dev/null 2>&1 && pnpm exec prettier --write "$f" 2>/dev/null ;;
esac
exit 0
