#!/usr/bin/env bash
# Stand up (or refresh) the litellm-tts shim: ElevenLabs streaming TTS behind
# an OpenAI-compatible /v1/audio/speech on 127.0.0.1:4000. Idempotent.
#
# Secrets: materialized per-run from 1Password; never committed.
set -euo pipefail

CFG_DIR="${VOICE_TTS_DIR:-$HOME/.voicemode/litellm-tts}"
IMAGE="ghcr.io/berriai/litellm-database:v1.91.0"
OP_ITEM="op://cloud/eleven-labs-api-dev/credential"

mkdir -p "$CFG_DIR"
cp "$(dirname "$0")/config.yaml" "$CFG_DIR/config.yaml"

umask 077
op read "$OP_ITEM" | sed 's/^/ELEVENLABS_API_KEY=/' > "$CFG_DIR/secrets.env"

docker rm -f litellm-tts >/dev/null 2>&1 || true
# Directory mount, not single-file: Docker Desktop WSL single-file binds break
# when the mounted file's inode changes (any editor/tool rewrite).
docker run -d --name litellm-tts --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  --env-file "$CFG_DIR/secrets.env" \
  -v "$CFG_DIR":/app/cfg:ro \
  "$IMAGE" --config /app/cfg/config.yaml --port 4000

for _ in $(seq 1 30); do
  curl -sf http://127.0.0.1:4000/v1/models >/dev/null 2>&1 && break
  sleep 2
done
curl -sf http://127.0.0.1:4000/v1/models | grep -q tts-1 && echo "litellm-tts up on 127.0.0.1:4000"
