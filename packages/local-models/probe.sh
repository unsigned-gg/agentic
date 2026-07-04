#!/usr/bin/env bash
# Probe this machine and print the model tier it can serve (see MODELS.md).
# Read-only; degrades gracefully with no GPU (CPU tier). Works on WSL2
# (nvidia-smi passes through when the Windows driver + CUDA-on-WSL are set up).
set -euo pipefail

vram_mib=0
gpu_name="none"
if command -v nvidia-smi >/dev/null 2>&1; then
  # First GPU only — multi-GPU users know who they are.
  line="$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 || true)"
  if [ -n "$line" ]; then
    gpu_name="${line%%,*}"
    vram_mib="$(echo "${line##*,}" | tr -d ' ')"
  fi
fi

ram_gib=$(( $(awk '/MemTotal/ {print $2}' /proc/meminfo) / 1024 / 1024 ))
vram_gib=$(( vram_mib / 1024 ))

echo "gpu:  ${gpu_name} (${vram_gib} GiB VRAM)"
echo "ram:  ${ram_gib} GiB"

tier="cpu-only"
if   [ "$vram_gib" -ge 70 ]; then tier="T4-server"
elif [ "$vram_gib" -ge 40 ]; then tier="T3-multi"
elif [ "$vram_gib" -ge 30 ]; then tier="T2-moe"
elif [ "$vram_gib" -ge 20 ]; then tier="T1-single"
elif [ "$vram_gib" -ge 10 ]; then tier="T0-small"
fi

echo "tier: ${tier}"
echo
echo "Model picks for this tier: see MODELS.md § ${tier}"
if [ "$tier" = "cpu-only" ]; then
  echo "note: no/low VRAM detected — ollama with a small quant (or a cloud model) is the honest choice."
fi
