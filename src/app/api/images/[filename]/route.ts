import { NextResponse } from "next/server";
import path from "node:path";
import { getFileStore } from "@/lib/storage";

type Ctx = { params: Promise<{ filename: string }> };
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
};

export async function GET(_: Request, { params }: Ctx) {
  const { filename } = await params;
  const safe = path.basename(filename); // 경로 탈출 방지
  const key = `articles/images/${safe}`;
  const store = getFileStore();

  // Blob 백엔드면 CDN URL로 302 → 함수 시간 + 트래픽 절약
  const external = await store.externalUrl(key);
  if (external) {
    return NextResponse.redirect(external, 302);
  }

  // LocalFs — bytes 직접 stream
  const buf = await store.readBuffer(key);
  if (!buf) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream" },
  });
}
