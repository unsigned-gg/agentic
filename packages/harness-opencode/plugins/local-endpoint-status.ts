/**
 * Local-endpoint status plugin: on session start, probe the three local
 * OpenAI-compatible endpoints (ollama :11434, llama.cpp :8080, vLLM :8000)
 * and toast which are live — so you know before picking a local provider.
 *
 * Plugin API per opencode docs (pinned @opencode-ai/plugin 1.17.13).
 */
import type { Plugin } from "@opencode-ai/plugin";

const ENDPOINTS: Record<string, string> = {
  ollama: "http://localhost:11434/v1",
  llamacpp: "http://localhost:8080/v1",
  vllm: "http://localhost:8000/v1",
};

async function alive(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const LocalEndpointStatus: Plugin = async ({ client }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.created") return;
      const live: string[] = [];
      for (const [name, url] of Object.entries(ENDPOINTS)) {
        if (await alive(url)) live.push(name);
      }
      if (live.length > 0) {
        await client.tui
          .showToast({
            body: { message: `local endpoints live: ${live.join(", ")}`, variant: "info" },
          })
          .catch(() => {});
      }
    },
  };
};
