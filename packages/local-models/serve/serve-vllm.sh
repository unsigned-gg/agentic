#!/usr/bin/env bash
# Serve a HF model via vLLM's OpenAI-compatible server on :8000 — agent-ready
# flags (auto tool choice + parser). vLLM is the production-grade path
# (throughput, concurrent harnesses); llama.cpp/ollama are the lighter paths.
# Usage: serve-vllm.sh <hf-model-id> <tool-parser> [max-model-len]
#   e.g.: serve-vllm.sh Qwen/Qwen3.6-27B-Instruct hermes 65536
set -euo pipefail

MODEL="${1:?usage: serve-vllm.sh <hf-model-id> <tool-parser> [max-model-len]}"
PARSER="${2:?tool parser required (e.g. hermes, qwen, mistral — match the model family)}"
MAXLEN="${3:-65536}"

command -v vllm >/dev/null 2>&1 || {
  echo "vllm not found. Install into a dedicated env: uv tool install vllm (GPU wheel per your CUDA)." >&2
  exit 1
}

exec vllm serve "$MODEL" \
  --max-model-len "$MAXLEN" \
  --enable-auto-tool-choice \
  --tool-call-parser "$PARSER" \
  --host 127.0.0.1 \
  --port 8000
