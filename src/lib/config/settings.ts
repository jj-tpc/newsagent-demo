import fs from "node:fs/promises";
import path from "node:path";
import type { ProviderName } from "../llm/types";
import { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODELS } from "../llm/models";

export interface Settings {
  provider: ProviderName;
  models: Record<ProviderName, string>;
}

const PROVIDERS: ProviderName[] = ["anthropic", "openai", "gemini"];

function normalize(raw: Partial<Settings> | null | undefined): Settings {
  const provider = PROVIDERS.includes(raw?.provider as ProviderName)
    ? (raw!.provider as ProviderName)
    : DEFAULT_PROVIDER;
  const models = {} as Record<ProviderName, string>;
  for (const p of PROVIDERS) {
    const wanted = raw?.models?.[p];
    const valid = wanted && MODEL_CATALOG[p].some((m) => m.id === wanted);
    models[p] = valid ? (wanted as string) : DEFAULT_MODELS[p];
  }
  return { provider, models };
}

export function makeSettingsStore(file: string) {
  return {
    async get(): Promise<Settings> {
      try {
        const raw = JSON.parse(await fs.readFile(file, "utf8")) as Partial<Settings>;
        return normalize(raw);
      } catch {
        return normalize(null);
      }
    },
    async save(patch: Partial<Settings>): Promise<Settings> {
      const cur = await this.get();
      const merged = normalize({
        provider: patch.provider ?? cur.provider,
        models: { ...cur.models, ...(patch.models ?? {}) },
      });
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(merged, null, 2), "utf8");
      return merged;
    },
  };
}

export const settingsStore = makeSettingsStore(
  path.join(process.cwd(), "data", "config", "settings.json"),
);
