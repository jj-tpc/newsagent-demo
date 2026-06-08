# Solution B 설계 — TS 포팅 + Vercel Blob 단독

- 작성일: 2026-06-08
- 상태: 설계
- 선행: [2026-06-08-vercel-crawler-diagnosis.md](2026-06-08-vercel-crawler-diagnosis.md)
- 결정사항: Vercel Hobby (60초 함수 한도) + Vercel Blob 단독 저장소

## 1. 스토리지 추상화

`src/lib/storage/file-store.ts`:

```ts
export interface FileStore {
  readText(key: string): Promise<string | null>;
  readBuffer(key: string): Promise<ArrayBuffer | null>;
  write(key: string, data: string | ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;  // 키만 반환
  publicUrl(key: string): string;            // 이미지 직접 노출용
}
```

두 구현체:
- **`LocalFsFileStore`** — `data/` 기반. `publicUrl(key)` → `/api/images/<basename>` (기존 라우트 그대로)
- **`VercelBlobFileStore`** — `@vercel/blob`의 `put / del / list / head`. `publicUrl(key)` → Blob public URL

런타임 분기:
```ts
export const fileStore: FileStore =
  process.env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobFileStore()
    : new LocalFsFileStore(process.cwd());
```

로컬 dev → 토큰 없으므로 자동 fs 폴백. Vercel deploy → env에 토큰 세팅 → Blob 사용.

## 2. 도메인 store 마이그레이션

기존 인터페이스 유지(API route 호환), 내부만 FileStore로 교체:

- `articleStore`
  - `list()` → `fileStore.list("articles/")` → 각 JSON parse
  - `create(a)` → `fileStore.write("articles/<id>.json", JSON)`
  - `remove(id)` → `fileStore.delete("articles/<id>.json")`
- `settingsStore` — key `config/settings.json`
- `promptStore` — `prompts/<name>.md`, defaults는 deployment bundle 안의 `prompts/defaults/` 그대로 (read-only로 가능)

이미지:
- 저장 키: `articles/images/<id>_<i>.<ext>`
- `Article.images[i].filename`은 **basename 그대로** 유지 (schema 변동 없음)
- `/api/images/[filename]` 라우트:
  - LocalFs: 기존대로 디스크에서 stream
  - Blob: `fileStore.publicUrl("articles/images/" + filename)` 으로 **302 redirect** (Blob CDN으로 직결)

## 3. TS 크롤러 모듈

`src/lib/crawler/`:

- `search.ts` — Naver mobile search HTML fetch + cheerio로 `n.news.naver.com/article/...` + `m.sports.naver.com/.../article/...` URL 추출
- `extract.ts` — 기사 페이지 fetch + 제목·본문·날짜·캡션 있는 이미지. 기존 Python 로직 1:1 포팅 (selector 동일):
  - 본문: `#dic_area` → `div._article_content` → `#newsct_article` → `article`
  - 캡션: `em.img_desc` / `figcaption` / `span.end_photo_org_desc` selector + 같은 부모 안 가드
  - 본문=캡션 fallback (이미지 1장, 본문 ≤350자)
  - lazy 속성: `data-original`, `data-lazy-src`, `data-lazyload`
  - 프로토콜 상대 URL → `https:` 자동
- `cleanup.ts` — OpenAI structured-output(`response_format: json_schema`)으로 본문 정리 + 태그. `lib/llm/openai.ts`의 client 패턴 재사용
- `next-id.ts` — `fileStore.list("articles/")` → 올해 max(NNNN)+1
- `run.ts` — async generator. SSE에 그대로 흘릴 진행 이벤트:
  ```ts
  type CrawlEvent =
    | { type: "search"; total: number }
    | { type: "fetching"; url: string }
    | { type: "saved"; id: string; images: number }
    | { type: "skipped"; url: string; reason: "duplicate" }
    | { type: "failed"; url: string; reason: string }
    | { type: "done"; succeeded: number; failed: number; skipped: number };
  ```

의존성 추가:
- `cheerio` (HTML 파싱)
- `@vercel/blob`

## 4. `/api/crawl` 재작성

```ts
export const runtime = "nodejs";
export const maxDuration = 60;  // Hobby tier 한도 사용
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ... 검증 ...
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runCrawl({ keyword, count })) {
          controller.enqueue(encode(sse(ev.type, ev)));
        }
        controller.enqueue(encode(sse("done", {})));
      } catch (e) {
        controller.enqueue(encode(sse("error", { message: (e as Error).message })));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
```

기존 `spawn` 제거. `child_process` import 제거.

## 5. count 캡 강제

60초 안에 안전하게 끝나도록:
- LLM 호출 1건 평균 3-5초 (Sonnet 4.6 structured output)
- 기사 fetch + 이미지 다운로드: ~3-5초/건
- 5개면 30-50초, 7개면 약 50-65초

**Hobby tier 안전 캡: 5개**. UI에서 max 7로 안내하되 7 이상은 막음. 현재 UI는 max 20 — 같이 조정.

## 6. CrawlerPanel UI 변경

- 이벤트 파싱 로직을 SSE의 `event:` 이름 기반으로 (현재는 raw 로그 정규식). 더 안정적이고 타입 안전
- "가져올 기사 수" max 20 → 7
- 진행 리스트는 그대로 (`fetching` → ⋯, `saved` → ✓, `failed` → ✕, `skipped` → —)

## 7. 마이그레이션 단계 (commit 단위)

1. **Phase 1**: `FileStore` 인터페이스 + `LocalFsFileStore` 구현. 모든 domain store 를 그 위로. 기존 동작 그대로, 테스트 통과
2. **Phase 2**: `VercelBlobFileStore` 추가 + 환경 분기. `/api/images/[filename]` 라우트 Blob 경로 redirect 지원
3. **Phase 3**: TS 크롤러 모듈 (`search`, `extract`, `cleanup`, `run`) + `/api/crawl` 재작성. 기존 Python (`크롤러/crawl.py`) 도 보존 (로컬 CLI 용도). `count` 캡 7로
4. **Phase 4**: Vercel 환경변수 가이드 + README, 시드 데이터 commit 결정

각 Phase 끝나고 commit. Phase 1-2는 fs도 Blob도 둘 다 통과해야 하므로 신중하게.

## 8. 환경 변수

- `BLOB_READ_WRITE_TOKEN` — Vercel 대시보드 → Storage → Blob → Create token
- `OPENAI_API_KEY` — 기존
- (로컬 dev) 둘 다 비워두면 fs + Anthropic/Gemini 가능

## 9. 비범위

- 인증 (현재 demo)
- 이미지 최적화 (Blob CDN이 알아서 처리)
- 시드 데이터 commit (별개 작업 — 이 진단 spec의 Solution A 의 일부였음)
- `프롬프트` 사용자 편집본의 Blob 저장 — 동일 패턴이라 같이 처리
- 멀티 유저 지원 (Blob bucket은 1개 공용)

## 10. 리스크

- Blob 비용: 무료 한도 충분 (~1GB, 100k 요청/월)
- 60초 한도 임박: 5개를 안전하게 처리하려면 LLM 호출이 빨라야 함. Sonnet 4.6은 평균 3-5초인데 가끔 8-10초까지 튐. 4개로 줄이는 게 더 안전할 수도
- Naver/OpenAI API rate limit: 동일

---

준비됐으면 Phase 1부터 들어갑니다.
