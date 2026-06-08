import type { Article } from "./types";
import type { FileStore } from "../storage/file-store";
import { getFileStore } from "../storage";

const PREFIX = "articles/";

function key(id: string): string {
  return `${PREFIX}${id}.json`;
}

export function makeStore(store: FileStore) {
  return {
    async list(): Promise<Article[]> {
      const keys = (await store.list(PREFIX))
        .filter((k) => k.endsWith(".json") && !k.startsWith(`${PREFIX}images/`));
      const out = await Promise.all(keys.map(async (k) => {
        const text = await store.readText(k);
        return text ? (JSON.parse(text) as Article) : null;
      }));
      return out
        .filter((a): a is Article => a !== null)
        .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    },
    async get(id: string): Promise<Article | null> {
      const text = await store.readText(key(id));
      return text ? (JSON.parse(text) as Article) : null;
    },
    async create(a: Article): Promise<Article> {
      await store.write(key(a.id), JSON.stringify(a, null, 2), "application/json");
      return a;
    },
    async update(id: string, patch: Partial<Article>): Promise<Article | null> {
      const cur = await this.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, id };
      await store.write(key(id), JSON.stringify(next, null, 2), "application/json");
      return next;
    },
    async remove(id: string): Promise<void> {
      await store.delete(key(id));
    },
  };
}

export const articleStore = makeStore(getFileStore());
