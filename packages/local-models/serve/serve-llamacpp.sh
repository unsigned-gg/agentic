#!/usr/bin/env bash
# Serve a GGUF model via llama.cpp's OpenAI-compatible server on :8080 —
# agent-ready flags (large context + native tool-call template).
# Usage: serve-llamacpp.sh /path/to/model.gguf [ctx-size]
set -euo pipefail

MODEL="${1:?usage: serve-llamacpp.sh /path/to/model.gguf [ctx-size]}"
CTX="${2:-32768}"

command -v llama-server >/dev/null 2>&1 || {
  echo "llama-server not found. Install llama.cpp (build from source or package manager — see README)." >&2
  exit 1
}

# --jinja: use the model's own chat template → native tool-calls (agent
#   harnesses break without this; see skills/local-model-triage).
# --ctx-size: agent sessions overflow serving defaults fast.
exec llama-server \
  --model "$MODEL" \
  --ctx-size "$CTX" \
  --jinja \
  --host 127.0.0.1 \
  --port 8080
