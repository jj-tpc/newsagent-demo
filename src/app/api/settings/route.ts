import { NextResponse } from "next/server";
import { settingsStore } from "@/lib/config/settings";
import { MODEL_CATALOG } from "@/lib/llm/models";
import type { Settings } from "@/lib/config/settings";

export async function GET() {
  const settings = await settingsStore.get();
  return NextResponse.json({ ...settings, catalog: MODEL_CATALOG });
}

export async function PUT(req: Request) {
  const patch = (await req.json()) as Partial<Settings>;
  const saved = await settingsStore.save(patch);
  return NextResponse.json(saved);
}
