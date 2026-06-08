import { NextResponse } from "next/server";
import path from "node:path";
import { getFileStore } from "@/lib/storage";
import type { Article } from "@/lib/articles/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ID_RE = /^\d{4}-\d{4}$/;
const IMG_TYPES: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

function jsonError(message: string, status: number, hint?: string): NextResponse {
  return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status });
}

/**
 * 한 요청 = 한 파일.
 *  .json     → 검증 후 articles/<id>.json
 *  이미지    → articles/images/<basename>
 *  그 외     → 400
 */
export async function POST(req: Request): Promise<NextResponse> {
  const onVercel = !!process.env.VERCEL;
  const blobTokenPresent = !!process.env.BLOB_READ_WRITE_TOKEN;
  const missingTokenHint = onVercel && !blobTokenPresent
    ? "Vercel 환경인데 BLOB_READ_WRITE_TOKEN 이 없습니다. Vercel 대시보드 → 프로젝트 → Storage 에서 Blob bucket을 만들면 토큰이 자동 주입됩니다. 만든 뒤 Redeploy 필요."
    : undefined;

  try {
    // formData 파싱 자체가 던질 수 있다 (body 한도 초과·multipart 깨짐 등)
    let form: FormData;
    try {
      form = await req.formData();
    } catch (e) {
      return jsonError(`multipart 파싱 실패: ${(e as Error)?.message ?? e}`, 400, missingTokenHint);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("file 필드가 필요합니다", 400, missingTokenHint);
    }

    if (onVercel && !blobTokenPresent) {
      // 토큰 없으면 LocalFs로 폴백 → Vercel read-only fs → EROFS 라서 미리 끊는다
      return jsonError(missingTokenHint!, 500);
    }

    const safe = path.basename(file.name);
    const ext = path.extname(safe).toLowerCase();
    const store = getFileStore();

    if (ext === ".json") {
      const text = await file.text();
      let parsed: Partial<Article>;
      try {
        parsed = JSON.parse(text) as Partial<Article>;
      } catch (e) {
        return jsonError(`JSON 파싱 실패: ${(e as Error)?.message ?? e}`, 400);
      }
      if (typeof parsed.id !== "string" || !ID_RE.test(parsed.id)) {
        return jsonError("id 형식이 YYYY-NNNN 아님", 400);
      }
      if (!parsed.title || typeof parsed.title !== "string") {
        return jsonError("title 필드가 비어있음", 400);
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

    return jsonError(`지원하지 않는 확장자: ${ext || "(없음)"}`, 400);
  } catch (e) {
    // store.write 가 던지는 모든 종류의 에러 (EROFS, BlobError, network 등)
    const message = (e as Error)?.message ?? String(e);
    const code = (e as NodeJS.ErrnoException)?.code;
    const stack = (e as Error)?.stack;
    const errorString = code ? `${code}: ${message}` : message;
    console.error("[/api/articles/upload] 실패:", errorString, stack);
    return jsonError(errorString, 500, missingTokenHint);
  }
}
