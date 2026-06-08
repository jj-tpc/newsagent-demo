import { NextResponse } from "next/server";
import { promptStore, type PromptName } from "@/lib/prompts/store";

export async function GET() {
  const names: PromptName[] = ["select", "answer"];
  const entries = await Promise.all(
    names.map(async (n) => [n, { text: await promptStore.get(n), overridden: await promptStore.isOverridden(n) }] as const),
  );
  return NextResponse.json(Object.fromEntries(entries));
}

export async function PUT(req: Request) {
  const { name, text } = (await req.json()) as { name: PromptName; text: string };
  if (name !== "select" && name !== "answer") {
    return NextResponse.json({ error: "invalid prompt name" }, { status: 400 });
  }
  await promptStore.set(name, text);
  return NextResponse.json({ ok: true });
}
