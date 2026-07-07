#!/usr/bin/env bash
# Serve ollama with agent-ready env — 64k default context (ollama's own
# default is 32k, which modern agent harnesses overflow before the first
# user word; see harness-omp/README "Local profile").
# Usage: serve-ollama.sh [ctx-length]
#
# The banked models' native limits are far higher (qwen3.6-27b-mtp: 262144),
# so context here is a VRAM trade, not a model limit: KV cache grows with
# context. Verified fits on the 32GB reference tier in MODELS.md.
set -euo pipefail

CTX="${1:-65536}"

command -v ollama >/dev/null 2>&1 || {
  echo "ollama not found. Pinned userspace install — see MODELS.md." >&2
  exit 1
}

if pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo "ollama serve already running — stop it first to apply ctx=${CTX}" >&2
  echo "  pkill -f 'ollama serve' && serve-ollama.sh ${CTX}" >&2
  exit 1
fi

# OLLAMA_CONTEXT_LENGTH: default context for models without an explicit
#   num_ctx (none of the banked Modelfiles pin one — deliberate, so this
#   knob controls them all).
# OLLAMA_LOAD_TIMEOUT: qwen3.6-35b-mtp cold-load exceeds the default.
OLLAMA_CONTEXT_LENGTH="$CTX" OLLAMA_LOAD_TIMEOUT=15m exec ollama serve
