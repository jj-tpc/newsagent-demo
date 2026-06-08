import fs from "node:fs/promises";
import path from "node:path";
import type { ProviderName } from "../llm/types";
import { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODELS } from "../llm/models";

export interface Settings {
  provider: ProviderName;
  models: Record<ProviderName, string>;
  /** 답변 한 번에 참조할 수 있는 최대 기사 수 (selectArticles 단계의 캡) */
  maxSources: number;
  /** 답변 본문에 포함할 수 있는 최대 이미지 수 (answer 단계의 캡) */
  maxImages: number;
}

const PROVIDERS: ProviderName[] = ["anthropic", "openai", "gemini"];

export const MAX_SOURCES_RANGE = { min: 1, max: 10 } as const;
export const MAX_IMAGES_RANGE = { min: 0, max: 6 } as const;
export const DEFAULT_MAX_SOURCES = 3;
export const DEFAULT_MAX_IMAGES = 3;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeInt(raw: unknown, fallback: number, lo: number, hi: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, lo, hi);
}

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
  return {
    provider,
    models,
    maxSources: normalizeInt(
      raw?.maxSources, DEFAULT_MAX_SOURCES,
      MAX_SOURCES_RANGE.min, MAX_SOURCES_RANGE.max,
    ),
    maxImages: normalizeInt(
      raw?.maxImages, DEFAULT_MAX_IMAGES,
      MAX_IMAGES_RANGE.min, MAX_IMAGES_RANGE.max,
    ),
  };
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
        maxSources: patch.maxSources ?? cur.maxSources,
        maxImages: patch.maxImages ?? cur.maxImages,
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
