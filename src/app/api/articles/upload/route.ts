import { NextResponse } from "next/server";
import path from "node:path";
import { getFileStore } from "@/lib/storage";
import type { Article } from "@/lib/articles/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID_RE = /^\d{4}-\d{4}$/;
const IMG_TYPES: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

/**
 * 다용도 단일 파일 업로드.
 * - .json 확장자 → 기사 JSON. 파싱·필수필드 검증 후 articles/<id>.json 로
 * - 이미지 확장자 → articles/images/<basename> 로
 * 그 외 확장자는 400.
 *
 * 의도적으로 한 요청 = 한 파일. 클라이언트가 다중 선택해도 순차 호출하면
 * Vercel 함수 body 한도(4.5MB) 안에서 안전하게 처리됨.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const safe = path.basename(file.name);
  const ext = path.extname(safe).toLowerCase();
  const store = getFileStore();

  if (ext === ".json") {
    const text = await file.text();
    let parsed: Partial<Article>;
    try {
      parsed = JSON.parse(text) as Partial<Article>;
    } catch {
      return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
    }
    if (typeof parsed.id !== "string" || !ID_RE.test(parsed.id)) {
      return NextResponse.json({ error: "id 형식이 YYYY-NNNN 아님" }, { status: 400 });
    }
    if (!parsed.title || typeof parsed.title !== "string") {
      return NextResponse.json({ error: "title 필드가 비어있음" }, { status: 400 });
    }
    if (!Array.isArray(parsed.images)) parsed.images = [];
    if (!Array.isArray(parsed.tags)) parsed.tags = [];
    if (typeof parsed.content !== "string") parsed.content = "";
    if (typeof parsed.publishedDate !== "string") parsed.publishedDate = "";

    await store.write(
      `articles/${parsed.id}.json`,
      JSON.stringify(parsed, null, 2),
      "application/json",
    );
    return NextResponse.json({ kind: "article", id: parsed.id });
  }

  if (IMG_TYPES[ext]) {
    const buf = await file.arrayBuffer();
    await store.write(`articles/images/${safe}`, buf, IMG_TYPES[ext]);
    return NextResponse.json({ kind: "image", filename: safe });
  }

  return NextResponse.json({ error: `지원하지 않는 확장자: ${ext || "(없음)"}` }, { status: 400 });
}
