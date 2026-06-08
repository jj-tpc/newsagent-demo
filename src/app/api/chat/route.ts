import { NextResponse } from "next/server";
import { getProvider } from "@/lib/llm";
import { articleStore } from "@/lib/articles/store";
import { runChat } from "@/lib/chat/orchestrator";
import { settingsStore } from "@/lib/config/settings";

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  try {
    const settings = await settingsStore.get();
    const model = settings.models[settings.provider];
    const result = await runChat({
      question,
      provider: getProvider(settings.provider),
      model,
      store: articleStore,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
