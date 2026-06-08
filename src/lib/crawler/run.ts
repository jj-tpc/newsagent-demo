import path from "node:path";
import { getFileStore } from "../storage";
import type { Article } from "../articles/types";
import { fetchSearchResults } from "./search";
import { fetchArticle, type RawArticle, type RawArticleImage } from "./extract";
import { cleanupArticle } from "./cleanup";
import { nextId, normalizeArticleUrl } from "./next-id";
import { loadExistingSourceUrls } from "./dedup";
import { REQUEST_DELAY_MS } from "./constants";

export type CrawlEvent =
  | { type: "started"; keyword: string; count: number }
  | { type: "search-done"; total: number }
  | { type: "skipped"; url: string; reason: "duplicate" }
  | { type: "fetching"; url: string }
  | { type: "phase"; url: string; phase: "본문 정리 중" | "이미지 저장 중" }
  | { type: "saved"; id: string; sourceUrl: string; images: number; title: string }
  | { type: "failed"; url: string; reason: string }
  | { type: "summary"; succeeded: number; failed: number; skipped: number };

const IMAGE_EXTS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function inferExtension(url: string, contentType: string | null): string {
  if (contentType) {
    const main = contentType.split(";")[0].trim().toLowerCase();
    if (IMAGE_EXTS[main]) return IMAGE_EXTS[main];
  }
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (ext && /^\.(jpe?g|png|webp|gif)$/.test(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  return ".jpg";
}

async function downloadAndSaveImages(
  id: string,
  images: RawArticleImage[],
): Promise<{ filename: string; caption: string }[]> {
  const store = getFileStore();
  const saved: { filename: string; caption: string }[] = [];
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    try {
      const resp = await fetch(img.src, { signal: ac.signal });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type");
      const ext = inferExtension(img.src, ct);
      const filename = `${id}_${i}${ext}`;
      const buf = await resp.arrayBuffer();
      await store.write(
        `articles/images/${filename}`,
        buf,
        ct?.split(";")[0].trim() ?? "image/jpeg",
      );
      saved.push({ filename, caption: img.caption });
      await sleep(REQUEST_DELAY_MS);
    } catch {
      // 이미지 1장 실패는 기사 자체 실패로 만들지 않음
    } finally {
      clearTimeout(timer);
    }
  }
  return saved;
}

export type RunOptions = {
  keyword: string;
  count: number;
  openaiModel: string;
};

export async function* runCrawl(opts: RunOptions): AsyncGenerator<CrawlEvent> {
  const { keyword, count, openaiModel } = opts;
  const store = getFileStore();

  yield { type: "started", keyword, count };

  const urls = await fetchSearchResults(keyword, count);
  yield { type: "search-done", total: urls.length };
  if (urls.length === 0) {
    yield { type: "summary", succeeded: 0, failed: 0, skipped: 0 };
    return;
  }
  await sleep(REQUEST_DELAY_MS);

  const seen = await loadExistingSourceUrls(store);
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const url of urls) {
    const norm = normalizeArticleUrl(url);
    if (seen.has(norm)) {
      yield { type: "skipped", url, reason: "duplicate" };
      skipped += 1;
      continue;
    }
    yield { type: "fetching", url };

    const raw = await fetchArticle(url);
    await sleep(REQUEST_DELAY_MS);
    if (!raw) {
      yield { type: "failed", url, reason: "기사 페이지 추출 실패" };
      failed += 1;
      continue;
    }

    yield { type: "phase", url, phase: "본문 정리 중" };
    let cleaned;
    try {
      cleaned = await cleanupArticle(raw.bodyText, keyword, openaiModel);
    } catch (e) {
      yield { type: "failed", url, reason: `LLM 정리 실패: ${(e as Error).message}` };
      failed += 1;
      continue;
    }

    const id = await nextId(store);
    yield { type: "phase", url, phase: "이미지 저장 중" };
    const savedImages = await downloadAndSaveImages(id, raw.images);

    const article: Article = {
      id,
      title: raw.title,
      content: cleaned.content,
      images: savedImages,
      publishedDate: raw.publishedDate,
      tags: cleaned.tags,
      sourceUrl: norm,
    };
    await store.write(
      `articles/${id}.json`,
      JSON.stringify(article, null, 2),
      "application/json",
    );
    seen.add(norm);
    succeeded += 1;
    yield {
      type: "saved",
      id,
      sourceUrl: norm,
      images: savedImages.length,
      title: raw.title,
    };
  }

  yield { type: "summary", succeeded, failed, skipped };
}

export type { RawArticle };
