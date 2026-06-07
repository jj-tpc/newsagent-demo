import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { IMAGES_DIR } from "../../../../data.config";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const safe = path.basename(file.name);
  await fs.writeFile(path.join(IMAGES_DIR, safe), new Uint8Array(await file.arrayBuffer()));
  return NextResponse.json({ filename: safe });
}
