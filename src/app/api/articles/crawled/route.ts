import { NextResponse } from "next/server";
import { articleStore } from "@/lib/articles/store";
import { getFileStore } from "@/lib/storage";

/** 크롤러가 만든 기사만 ( sourceUrl 이 있는 것 ) 추려 반환 */
async function listCrawled() {
  const all = await articleStore.list();
  return all.filter((a) => typeof a.sourceUrl === "string" && a.sourceUrl.length > 0);
}

export async function GET() {
  const crawled = await listCrawled();
  const imageCount = crawled.reduce((n, a) => n + a.images.length, 0);
  return NextResponse.json({ articles: crawled.length, images: imageCount });
}

export async function DELETE() {
  const fs = getFileStore();
  const crawled = await listCrawled();
  let imageRemoved = 0;
  for (const a of crawled) {
    for (const img of a.images) {
      try {
        await fs.delete(`articles/images/${img.filename}`);
        imageRemoved += 1;
      } catch {
        // 이미 없거나 다른 기사가 공유 — 무시
      }
    }
    await articleStore.remove(a.id);
  }
  return NextResponse.json({
    articles: crawled.length,
    images: imageRemoved,
  });
}
