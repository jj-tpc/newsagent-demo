import { runCrawl, type CrawlEvent } from "@/lib/crawler/run";
import { settingsStore } from "@/lib/config/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Hobby 60s 함수 한도 — 5건 안에서 안전하게 처리되도록 count 캡과 같이 사용
export const maxDuration = 60;

const MAX_KEYWORD = 50;
const MIN_COUNT = 1;
const MAX_COUNT = 7;   // Hobby tier 안전 캡

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

  // OpenAI 모델 선택 — 크롤러 정리는 가벼우니 settings의 openai 모델 그대로
  const settings = await settingsStore.get();
  const openaiModel = settings.models.openai;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendLine = (text: string) => {
        // 기존 CrawlerPanel이 받던 raw 로그 라인 — 디버깅용 유지
        controller.enqueue(encoder.encode(`data: ${text}\n\n`));
      };
      const sendEvent = (ev: CrawlEvent) => {
        controller.enqueue(encoder.encode(sse(ev.type, ev)));
      };

      try {
        for await (const ev of runCrawl({ keyword, count, openaiModel })) {
          sendEvent(ev);
          // 사람이 읽기 좋은 로그 라인도 같이 — details 토글의 raw 로그용
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
        controller.enqueue(encoder.encode(sse("done", { exitCode: 0 })));
      } catch (e) {
        const message = (e as Error).message;
        controller.enqueue(encoder.encode(sse("error", { message })));
        sendLine(`[stderr] ${message}`);
      } finally {
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
    },
  });
}
