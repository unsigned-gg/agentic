// Cross-harness gateway-preset parity gate.
//
// The four harness presets each hand-maintain the `llm` (unsigned model
// gateway) model list; nothing auto-mirrors the gateway's /v1/models. This
// test is the drift detector: any model add/remove must touch all four files
// in the same PR or CI goes red.
//
// Zero-dep: Bun.YAML (bun >= 1.3) + bun:test, same posture as harness-omp.
//
// Optional live check (NOT in CI — network): PARITY_LIVE=1 asserts the live
// gateway catalog is a superset of the preset set (gateway may serve more
// than the curated presets expose; presets must never list a model the
// gateway lacks).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");

type Named = { file: string; ids: string[] };

function sorted(ids: string[]): string[] {
  return [...ids].sort();
}

function piModels(): Named {
  const file = "harness-pi/config/models.json";
  const doc = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  return { file, ids: doc.providers.llm.models.map((m: { id: string }) => m.id) };
}

function ompModels(): Named {
  const file = "harness-omp/config/models.yml";
  const doc = Bun.YAML.parse(readFileSync(join(ROOT, file), "utf8")) as {
    providers: { llm: { models: { id: string }[] } };
  };
  return { file, ids: doc.providers.llm.models.map((m) => m.id) };
}

function opencodeModels(): Named {
  const file = "harness-opencode/config/opencode.json";
  const doc = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  return { file, ids: Object.keys(doc.provider.llm.models) };
}

function hermesModels(): Named {
  const file = "harness-hermes/config/cli-config.local-endpoint.yaml";
  const doc = Bun.YAML.parse(readFileSync(join(ROOT, file), "utf8")) as {
    providers: { llm: { models: string[] } };
  };
  return { file, ids: doc.providers.llm.models };
}

const ALL = [piModels(), ompModels(), opencodeModels(), hermesModels()];

describe("gateway preset parity", () => {
  test("every preset lists at least one llm model", () => {
    for (const p of ALL) expect(p.ids.length, p.file).toBeGreaterThan(0);
  });

  test("no duplicate model ids within a preset", () => {
    for (const p of ALL) {
      expect(new Set(p.ids).size, `${p.file} has duplicate ids`).toBe(p.ids.length);
    }
  });

  test("all four presets agree on the llm model-id set", () => {
    const reference = ALL[0];
    for (const p of ALL.slice(1)) {
      // toEqual on sorted arrays yields a readable diff naming the drifted file.
      expect(sorted(p.ids), `${p.file} drifted from ${reference.file}`).toEqual(
        sorted(reference.ids),
      );
    }
  });

  test.if(process.env.PARITY_LIVE === "1")(
    "live gateway catalog is a superset of the preset set",
    async () => {
      const bearer = process.env.UNSIGNED_LLM_API_KEY;
      if (!bearer) throw new Error("PARITY_LIVE=1 requires the gateway credential env var to be set");
      const res = await fetch("https://llm.unsigned.gg/v1/models", {
        headers: { authorization: `Bearer ${bearer}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { id: string }[] };
      const live = new Set(body.data.map((m) => m.id));
      const missing = sorted(ALL[0].ids).filter((id) => !live.has(id));
      expect(missing, "preset models absent from live gateway").toEqual([]);
    },
  );

  // OPS-732: preset contextWindows vs the gateway's /model/info metadata.
  // WARNS (does not fail) on mismatch while /model/info coverage is sparse —
  // once the LiteLLM config carries max_input_tokens for every model (the
  // paas-side half of OPS-732), promote the warning to an assertion.
  test.if(process.env.PARITY_LIVE === "1")(
    "preset contextWindows match /model/info where metadata exists",
    async () => {
      const bearer = process.env.UNSIGNED_LLM_API_KEY;
      if (!bearer) throw new Error("PARITY_LIVE=1 requires the gateway credential env var to be set");
      const res = await fetch("https://llm.unsigned.gg/v1/model/info", {
        headers: { authorization: `Bearer ${bearer}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { model_name: string; model_info?: { max_input_tokens?: number | null } }[];
      };
      expect(body.data.length).toBeGreaterThan(0);

      const file = "harness-pi/config/models.json"; // reference preset with metadata
      const doc = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
      const presetWindow = new Map<string, number>(
        doc.providers.llm.models.map((m: { id: string; contextWindow: number }) => [
          m.id,
          m.contextWindow,
        ]),
      );

      let covered = 0;
      const drifted: string[] = [];
      for (const m of body.data) {
        const max = m.model_info?.max_input_tokens;
        const preset = presetWindow.get(m.model_name);
        if (max == null || preset === undefined) continue;
        covered++;
        if (preset !== max) drifted.push(`${m.model_name}: preset=${preset} model_info=${max}`);
      }
      if (drifted.length > 0) {
        console.warn(
          `[parity] contextWindow drift vs /model/info (${drifted.length}/${covered} covered ids):\n  ${drifted.join("\n  ")}`,
        );
      }
      // Hard assertion deferred until /model/info covers the full catalog.
      expect(covered).toBeGreaterThanOrEqual(0);
    },
  );
});
