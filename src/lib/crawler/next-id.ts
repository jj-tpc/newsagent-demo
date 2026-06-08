import type { FileStore } from "../storage/file-store";

const ID_RE = /^articles\/(\d{4})-(\d{4})\.json$/;

/** target store에서 올해의 max(NNNN)+1 으로 다음 ID 생성. */
export async function nextId(store: FileStore): Promise<string> {
  const year = new Date().getFullYear();
  const keys = await store.list("articles/");
  let maxN = 0;
  for (const k of keys) {
    const m = k.match(ID_RE);
    if (!m) continue;
    if (Number(m[1]) !== year) continue;
    const n = Number(m[2]);
    if (n > maxN) maxN = n;
  }
  return `${year}-${String(maxN + 1).padStart(4, "0")}`;
}

export function normalizeArticleUrl(url: string): string {
  const base = url.split("?")[0].split("#")[0];
  return base.replace(/\/+$/, "");
}
