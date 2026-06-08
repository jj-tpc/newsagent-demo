import type { FileStore } from "../storage/file-store";
import type { Article } from "../articles/types";

/** 기존 저장된 기사들의 sourceUrl 집합 — 같은 URL 재크롤링 방지 */
export async function loadExistingSourceUrls(store: FileStore): Promise<Set<string>> {
  const urls = new Set<string>();
  const keys = (await store.list("articles/"))
    .filter((k) => k.endsWith(".json") && !k.startsWith("articles/images/"));
  for (const k of keys) {
    const text = await store.readText(k);
    if (!text) continue;
    try {
      const a = JSON.parse(text) as Partial<Article>;
      if (typeof a.sourceUrl === "string" && a.sourceUrl) urls.add(a.sourceUrl);
    } catch {
      // ignore malformed
    }
  }
  return urls;
}
