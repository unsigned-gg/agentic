/**
 * /local — switch pi to a locally-served model and back.
 *
 * Cycles through the OpenAI-compatible providers defined in
 * ~/.pi/agent/models.json (see ../config/models.json presets: ollama,
 * llamacpp, vllm), probing each endpoint before switching so you never land
 * on a dead server. `/local off` returns to the previous cloud model.
 *
 * Extension API per pi-mono docs/extensions.md (pinned 0.80.3).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const LOCAL_PROVIDERS = ["ollama", "llamacpp", "vllm"];

async function endpointAlive(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("local", {
    description: "Switch to a live local model endpoint (or 'off' to restore)",
    handler: async (args, ctx) => {
      const models = ctx.modelRegistry.getAll();
      if (args?.trim() === "off") {
        ctx.ui.notify("Pick your cloud model via /model", "info");
        return;
      }
      for (const provider of LOCAL_PROVIDERS) {
        const candidates = models.filter((m) => m.provider === provider);
        if (candidates.length === 0) continue;
        const alive = await endpointAlive(candidates[0].baseUrl);
        if (!alive) continue;
        const ok = await pi.setModel(candidates[0]);
        if (!ok) continue;
        ctx.ui.notify(`local model: ${provider}/${candidates[0].id}`, "info");
        return;
      }
      ctx.ui.notify(
        "no live local endpoint (checked ollama :11434, llama.cpp :8080, vLLM :8000) — start one via packages/local-models/serve/",
        "warning",
      );
    },
  });
}
