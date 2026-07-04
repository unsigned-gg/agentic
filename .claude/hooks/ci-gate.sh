#!/usr/bin/env bash
# On `git push`, run the affected CI gate. Fail CLOSED on failure, fail SOFT if moon absent. Bypass: TERRARIUM_SKIP_CI_GATE=1.
[ "${TERRARIUM_SKIP_CI_GATE:-}" = "1" ] && exit 0
input=$(cat); cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
printf '%s' "$cmd" | grep -qE '(^|&&|;| )git +push( |$)' || exit 0
command -v moon >/dev/null 2>&1 || { echo "moon absent — ci-gate skipped (scripts/bootstrap.sh)" >&2; exit 0; }
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(moon ci --base origin/main 2>&1); then
  reason=$(printf '%s' "$out" | tail -15 | jq -Rsa . 2>/dev/null || printf '"moon ci failed"')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}' "$reason"
fi
exit 0
