import { NextResponse } from "next/server";
import { promptStore, type PromptName } from "@/lib/prompts/store";

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name: PromptName };
  if (name !== "select" && name !== "answer") {
    return NextResponse.json({ error: "invalid prompt name" }, { status: 400 });
  }
  await promptStore.reset(name);
  return NextResponse.json({ text: await promptStore.getDefault(name) });
}
