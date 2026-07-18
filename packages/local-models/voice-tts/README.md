<!-- lineage
role: package-component-readme
conforms_to: ../README.md
consumes: config.yaml, run.sh, kokoro-rtx5090-torch-cu128.patch, fix-voicemode-plugin-python.sh
-->

# voice-tts

ElevenLabs **streaming TTS** for the workstation voice stack (voicemode),
served OpenAI-compatible on a fixed local port — same contract as the rest of
`local-models`: shim `:4000`, kokoro `:8880`, whisper `:2022`.

voicemode has no native ElevenLabs provider (only OpenAI / Kokoro / Cartesia),
so a localhost LiteLLM container fronts it: `POST /v1/audio/speech` →
`elevenlabs/eleven_flash_v2_5`, streaming PCM, ~0.3 s TTFB.

```bash
./run.sh          # materialize key from 1P, (re)create the litellm-tts container
```

## Models served (config.yaml)

| Alias | Proxied model | $/char |
|---|---|---|
| `tts-1`, `elevenlabs-tts` | `elevenlabs/eleven_flash_v2_5` | 0.000033 |
| `elevenlabs-tts-hq` | `elevenlabs/eleven_multilingual_v2` | 0.000066 |

Cost basis: ElevenLabs Pro, $99/mo ÷ 1.5 M credits; flash = 0.5 credit/char,
multilingual = 1 credit/char. The `tts-1` alias exists so voicemode can send
ONE model name to both this shim and the kokoro fallback — kokoro 400s on
unknown model names.

## voicemode wiring (`~/.voicemode/voicemode.env`)

```bash
VOICEMODE_TTS_BASE_URLS=http://127.0.0.1:4000/v1,http://127.0.0.1:8880/v1
VOICEMODE_TTS_MODELS=tts-1
VOICEMODE_VOICES=FGY2WhTYpPnrIDTdsKH5,af_sky   # Laura (ElevenLabs voice_id)
VOICEMODE_STREAMING_ENABLED=true
VOICEMODE_TTS_AUDIO_FORMAT=pcm
```

**Voice caveat:** the primary voice is a raw ElevenLabs voice_id, which the
kokoro fallback rejects (400). If the shim is down, pass `voice="af_sky"`
explicitly (converse param) or flip `VOICEMODE_VOICES` order. A shim-side
default (`litellm_params.voice`) does NOT work — the request param wins.
The operator's own professional clone (`Rp8HCB07pOfBPQX1dUG0`) is blocked
upstream: fine-tuning never completed ("not fine-tuned and cannot be used").

## Companion fixes

- **`kokoro-rtx5090-torch-cu128.patch`** — the kokoro fallback crash-loops on
  RTX 5090 (sm_120): torch 2.6.0+cu124 tops out at sm_90. Apply to
  `~/.voicemode/services/kokoro/` (its `start-gpu.sh` reinstalls from
  pyproject on every boot, so the pin must live there):
  `git -C ~/.voicemode/services/kokoro apply <patch> && systemctl --user restart voicemode-kokoro`
- **`fix-voicemode-plugin-python.sh`** — re-pin Python 3.12 for the voicemode
  Claude Code plugin after plugin updates (Python 3.14 breaks the
  pydantic-core build → MCP -32000).

## Known limits

- One cosmetic LiteLLM startup warning (`register_model:
  elevenlabs/eleven_flash_v2_5 not in built-in cost map`) — upstream in
  v1.91; per-request cost IS computed from the custom pricing above.
- Cost visibility: without `DATABASE_URL` the shim computes but does not
  persist spend. Point it at a postgres (litellm-database image supports it)
  if per-call spend logs are wanted.
- Cluster promotion (retiring this shim for the llm gateway): OPS-685.
