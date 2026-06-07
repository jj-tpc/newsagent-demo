import { NextResponse } from "next/server";
import { articleStore } from "@/lib/articles/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const a = await articleStore.get(id);
  return a ? NextResponse.json(a) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json();
  const updated = await articleStore.update(id, patch);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await articleStore.remove(id);
  return NextResponse.json({ ok: true });
}
