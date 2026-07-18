# Changelog

## 1.0.0 (2026-07-18)


### Added

* **ci:** scheduled live gateway-parity check (OPS-729) ([#33](https://github.com/unsigned-gg/agentic/issues/33)) ([8794c9b](https://github.com/unsigned-gg/agentic/commit/8794c9b79170cf4ed53f3d897f121d35b6994397))
* **ci:** SHA-pin all actions + dependabot bumps (OPS-730) ([#32](https://github.com/unsigned-gg/agentic/issues/32)) ([987836b](https://github.com/unsigned-gg/agentic/commit/987836b0ded2cea5031eb8a1e5866b6b7bd77fea))
* **context:** estate orientation package + estate-orient skill ([6ba71d1](https://github.com/unsigned-gg/agentic/commit/6ba71d1c7b65d5188be4af30f0496bf98ca5bad5))
* **create:** full agentic tooling + terminal picker ([9afba94](https://github.com/unsigned-gg/agentic/commit/9afba943d4997a9bc499d189dbe5de491e8b8339))
* **create:** PostHog-style install wizard for cerebral/unsigned agent tooling ([87f51c2](https://github.com/unsigned-gg/agentic/commit/87f51c2de6d5cb95d3e3d76a11678068ce0adf83))
* **harness-omp:** config.gateway-slim.yml — full tools, allowlisted skills (OPS-481 row D) ([#19](https://github.com/unsigned-gg/agentic/issues/19)) ([547f5ca](https://github.com/unsigned-gg/agentic/commit/547f5ca09e4e6a9d4332ade9196835069c23758f))
* **harness-omp:** local-model context profile (~39k → ~12k tokens) ([#8](https://github.com/unsigned-gg/agentic/issues/8)) ([4cefdda](https://github.com/unsigned-gg/agentic/commit/4cefdda819a72986ea581f91a7ea8e6ccbbf7201))
* **harness-omp:** oh-my-pi as fourth harness, pinned at 16.3.11 ([#7](https://github.com/unsigned-gg/agentic/issues/7)) ([0b6ed8e](https://github.com/unsigned-gg/agentic/commit/0b6ed8e15d1581682f19088312f8e325d1ae9e64))
* **harnesses:** add neuralwatt provider (hosted GLM-5.2 gateway) ([#4](https://github.com/unsigned-gg/agentic/issues/4)) ([bbcab09](https://github.com/unsigned-gg/agentic/commit/bbcab093c6d5229d0113fa6875aee43fb1dc6876))
* **harnesses:** gateway rename — provider llm, llm.unsigned.gg, UNSIGNED_LLM_API_KEY ([#10](https://github.com/unsigned-gg/agentic/issues/10)) ([62a66da](https://github.com/unsigned-gg/agentic/commit/62a66da7e86bf544811af38b2d5cb3fcc3275571))
* **local-models:** 64k-context ollama serving, verified on the 32GB tier ([#9](https://github.com/unsigned-gg/agentic/issues/9)) ([b103b73](https://github.com/unsigned-gg/agentic/commit/b103b73636a771d393433d07d2a1b32158a8e789))
* **local-models:** bench dashboard + provenance-verified frontier leaderboard ([#2](https://github.com/unsigned-gg/agentic/issues/2)) ([02bc09e](https://github.com/unsigned-gg/agentic/commit/02bc09e16db7c3e189551cbe0e45daa10d105873))
* **local-models:** voice-tts — ElevenLabs streaming TTS shim for voicemode ([#26](https://github.com/unsigned-gg/agentic/issues/26)) ([5936400](https://github.com/unsigned-gg/agentic/commit/59364005007248550fa955dae513e3a4508edfc8))
* **presets-parity:** contextWindow drift check vs /model/info (OPS-732) ([#39](https://github.com/unsigned-gg/agentic/issues/39)) ([8e5e825](https://github.com/unsigned-gg/agentic/commit/8e5e8250362c83382464f9481b7d02073451c870))
* **presets-parity:** gateway-preset drift gate + hermes pin-drift test ([#14](https://github.com/unsigned-gg/agentic/issues/14)) ([94c95a1](https://github.com/unsigned-gg/agentic/commit/94c95a12f94cc6fffcaaa81951e417191791a095))
* **presets:** default the gateway provider to google/gemini-3.5-flash ([#15](https://github.com/unsigned-gg/agentic/issues/15)) ([d0c5a4f](https://github.com/unsigned-gg/agentic/commit/d0c5a4fc2be2eaac22050dd50c0017c5e6044871))
* **presets:** sync gateway model map with the live catalog (41 models) ([#28](https://github.com/unsigned-gg/agentic/issues/28)) ([d83b0b8](https://github.com/unsigned-gg/agentic/commit/d83b0b89224d0ada4ce86167b360c832eeb7329c))
* **shepherd:** runtime-substrate package pinned at shepherd-ai 0.2.1 ([#6](https://github.com/unsigned-gg/agentic/issues/6)) ([4d47cb2](https://github.com/unsigned-gg/agentic/commit/4d47cb2cce69fde3da04cf3535f02d1a6a037f74))
* workspace scaffold — three harnesses, shared skills, local-model bootstrap ([#1](https://github.com/unsigned-gg/agentic/issues/1)) ([fef6b22](https://github.com/unsigned-gg/agentic/commit/fef6b2248bb2c7422b858206b5f1a5097863364a))


### Fixed

* **ci:** serialize pnpm install before moon ci ([#31](https://github.com/unsigned-gg/agentic/issues/31)) ([59a2d4f](https://github.com/unsigned-gg/agentic/commit/59a2d4ff65de7571cd17ae2fe18be91883b99edd))
* **ci:** valid moon project config for packages/create ([04e4140](https://github.com/unsigned-gg/agentic/commit/04e4140111849592237301e3b9990636db03e732))
* **harness-omp:** sync includeSkills allowlists with packages/skills (estate-orient) ([cb98058](https://github.com/unsigned-gg/agentic/commit/cb980585feafcab06616992d45d6eb9ebc87b0c2))
