import { getProvider } from "@/lib/llm";
import { articleStore } from "@/lib/articles/store";
import { runChatStream } from "@/lib/chat/orchestrator";
import { settingsStore } from "@/lib/config/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) {
    return Response.json({ error: "question required" }, { status: 400 });
  }

  const settings = await settingsStore.get();
  const model = settings.models[settings.provider];
  const provider = getProvider(settings.provider);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runChatStream({
          question, provider, model, store: articleStore,
        })) {
          controller.enqueue(encoder.encode(sse(event.type, event)));
        }
        controller.enqueue(encoder.encode(sse("done", {})));
      } catch (e) {
        const message = (e as Error).message;
        controller.enqueue(encoder.encode(sse("error", { message })));
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      // 클라이언트가 끊으면 generator도 자연 종료됨
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
