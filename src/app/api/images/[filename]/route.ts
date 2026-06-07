import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { IMAGES_DIR } from "../../../../../data.config";

type Ctx = { params: Promise<{ filename: string }> };
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
};

export async function GET(_: Request, { params }: Ctx) {
  const { filename } = await params;
  const safe = path.basename(filename); // 경로 탈출 방지
  try {
    const buf = await fs.readFile(path.join(IMAGES_DIR, safe));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
