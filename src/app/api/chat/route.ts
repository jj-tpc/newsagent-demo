import { NextResponse } from "next/server";
import { getProvider } from "@/lib/llm";
import type { ProviderName } from "@/lib/llm/types";
import { articleStore } from "@/lib/articles/store";
import { runChat } from "@/lib/chat/orchestrator";

export async function POST(req: Request) {
  const { question, provider } = (await req.json()) as { question: string; provider: ProviderName };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  try {
    const result = await runChat({ question, provider: getProvider(provider), store: articleStore });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
