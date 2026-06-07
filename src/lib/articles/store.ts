import fs from "node:fs/promises";
import path from "node:path";
import type { Article } from "./types";

export function makeStore(dir: string) {
  const file = (id: string) => path.join(dir, `${id}.json`);
  return {
    async list(): Promise<Article[]> {
      await fs.mkdir(dir, { recursive: true });
      const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
      const out = await Promise.all(
        names.map(async (n) => JSON.parse(await fs.readFile(path.join(dir, n), "utf8")) as Article),
      );
      return out.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    },
    async get(id: string): Promise<Article | null> {
      try { return JSON.parse(await fs.readFile(file(id), "utf8")) as Article; }
      catch { return null; }
    },
    async create(a: Article): Promise<Article> {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(a.id), JSON.stringify(a, null, 2), "utf8");
      return a;
    },
    async update(id: string, patch: Partial<Article>): Promise<Article | null> {
      const cur = await this.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, id };
      await fs.writeFile(file(id), JSON.stringify(next, null, 2), "utf8");
      return next;
    },
    async remove(id: string): Promise<void> {
      try { await fs.unlink(file(id)); } catch { /* already gone */ }
    },
  };
}

import { DATA_DIR } from "../../../data.config";
export const articleStore = makeStore(DATA_DIR);
