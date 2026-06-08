import { runCrawl, type CrawlEvent } from "@/lib/crawler/run";
import { settingsStore } from "@/lib/config/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Hobby 60s 함수 한도
export const maxDuration = 60;

const MAX_KEYWORD = 50;
const MIN_COUNT = 1;
const MAX_COUNT = 7;

const HEARTBEAT_MS = 3000;  // 3초 이상 이벤트 없으면 keep-alive comment

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const countRaw = url.searchParams.get("count") ?? "5";
  const count = Math.floor(Number(countRaw));

  if (!keyword || keyword.length > MAX_KEYWORD) {
    return Response.json({ error: `keyword required (1-${MAX_KEYWORD} chars)` }, { status: 400 });
  }
  if (!Number.isFinite(count) || count < MIN_COUNT || count > MAX_COUNT) {
    return Response.json({ error: `count must be ${MIN_COUNT}-${MAX_COUNT}` }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const settings = await settingsStore.get();
  const openaiModel = settings.models.openai;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (s: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(s)); }
        catch { closed = true; }
      };
      const sendLine = (text: string) => safeEnqueue(`data: ${text}\n\n`);
      const sendEvent = (ev: CrawlEvent) => safeEnqueue(sse(ev.type, ev));

      // SSE keep-alive — 일정 시간 이벤트 없으면 ":heartbeat" comment 발화.
      // 클라이언트 EventSource는 comment를 무시하지만 프록시는 살아있다고 인식.
      const heartbeat = setInterval(() => safeEnqueue(`:hb ${Date.now()}\n\n`), HEARTBEAT_MS);

      try {
        for await (const ev of runCrawl({ keyword, count, openaiModel })) {
          sendEvent(ev);
          switch (ev.type) {
            case "started":
              sendLine(`[config] keyword=${JSON.stringify(ev.keyword)} count=${ev.count}`);
              break;
            case "search-done":
              sendLine(`[search] found ${ev.total} naver-hosted article links`);
              break;
            case "fetching":
              sendLine(`[article] GET ${ev.url}`);
              break;
            case "phase":
              sendLine(`[phase] ${ev.phase}`);
              break;
            case "saved":
              sendLine(`[save] ${ev.id}.json  (images: ${ev.images})`);
              break;
            case "skipped":
              sendLine(`[skip] 이미 저장됨: ${ev.url}`);
              break;
            case "failed":
              sendLine(`[article] FAILED ${ev.url}: ${ev.reason}`);
              break;
            case "summary":
              sendLine(`완료: 성공 ${ev.succeeded}건, 실패 ${ev.failed}건, 중복 제외 ${ev.skipped}건`);
              break;
          }
        }
        safeEnqueue(sse("done", { exitCode: 0 }));
      } catch (e) {
        const message = (e as Error).message;
        safeEnqueue(sse("error", { message }));
        sendLine(`[stderr] ${message}`);
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      // 클라이언트 abort 시 generator는 자연 종료
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Vercel proxy + nginx류에 SSE 버퍼링 끄기 힌트
      "X-Accel-Buffering": "no",
    },
  });
}
