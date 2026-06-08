import { NextResponse } from "next/server";
import path from "node:path";
import { getFileStore } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
};

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  const safe = path.basename(file.name);
  const ext = path.extname(safe).toLowerCase();
  const contentType = TYPES[ext] ?? file.type ?? "application/octet-stream";
  const buf = await file.arrayBuffer();
  await getFileStore().write(`articles/images/${safe}`, buf, contentType);
  return NextResponse.json({ filename: safe });
}
