import fs from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "../storage/file-store";
import { getFileStore } from "../storage";

export type PromptName = "select" | "answer";

type DefaultsReader = (name: PromptName) => Promise<string>;

const PREFIX = "prompts/";
const key = (name: PromptName) => `${PREFIX}${name}.md`;

/**
 * activeStore — 사용자 편집본 저장소 (Blob 또는 LocalFs)
 * defaultsReader — 번들된 기본 프롬프트 텍스트 fetch (deployment bundle 안)
 */
export function makePromptStore(activeStore: FileStore, defaultsReader: DefaultsReader) {
  return {
    async getDefault(name: PromptName): Promise<string> {
      return defaultsReader(name);
    },
    async isOverridden(name: PromptName): Promise<boolean> {
      return (await activeStore.readText(key(name))) !== null;
    },
    async get(name: PromptName): Promise<string> {
      const override = await activeStore.readText(key(name));
      if (override !== null) return override;
      return defaultsReader(name);
    },
    async set(name: PromptName, text: string): Promise<void> {
      await activeStore.write(key(name), text, "text/markdown; charset=utf-8");
    },
    async reset(name: PromptName): Promise<void> {
      await activeStore.delete(key(name));
    },
  };
}

const PROD_DEFAULTS_DIR = path.join(process.cwd(), "prompts", "defaults");

async function readBundledDefault(name: PromptName): Promise<string> {
  return fs.readFile(path.join(PROD_DEFAULTS_DIR, `${name}.md`), "utf8");
}

export const promptStore = makePromptStore(getFileStore(), readBundledDefault);
