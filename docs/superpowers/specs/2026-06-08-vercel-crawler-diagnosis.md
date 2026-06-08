# Vercel에서 크롤러가 안 돌아가는 이유 — 진단 + 해결책

- 작성일: 2026-06-08
- 상태: 진단 (사용자 결정 대기 — Solution A / B / C / D 중 선택)

## 1. 한 줄 요약

**현재 크롤러는 "내 노트북에서 돌리는 Python 스크립트"로 설계되어 있다. Vercel Serverless에서는 Python 런타임이 없고 파일 시스템도 쓸 수 없어서, 코드 한 줄 안 바꾸고는 절대 안 돌아간다.** 본질적인 아키텍처 미스매치 4가지를 한꺼번에 해결해야 한다.

## 2. 구체적 실패 요인

### 2.1. Python 런타임 부재 (치명적)

[`src/app/api/crawl/route.ts:31-43`](../../../src/app/api/crawl/route.ts):

```ts
const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "py" : "python3");
const scriptPath = path.join(process.cwd(), "크롤러", "crawl.py");
const args = [scriptPath, "--keyword", keyword, "--count", String(count), "--to-data"];
const proc = spawn(pythonBin, args, { ... });
```

- Vercel Serverless Functions는 **AWS Lambda 위의 Node.js 런타임**. Python 바이너리 없음.
- `spawn("python3", ...)` → `ENOENT: no such file or directory, posix_spawn 'python3'`
- 그래서 `proc.on("error", ...)` 가 발화 → SSE `event: error` 로 `python3 not found` 류 메시지가 클라이언트에 흘러올 것

**증거**: 이 상태에서 "크롤링 실행" 누르면, 진행 리스트는 비어 있고 상세 로그에 spawn 에러 한 줄이 뜨고 종료.

### 2.2. 파일 시스템 쓰기 금지 (치명적)

Vercel Serverless 파일 시스템은 **deployment bundle 영역은 read-only**. 쓸 수 있는 곳은 `/tmp`뿐, 그것마저 **invocation 종료 시 휘발**.

쓰기를 시도하는 곳들:
- [`크롤러/crawl.py:417-419`](../../../크롤러/crawl.py) — `data/articles/<id>.json` 저장
- [`크롤러/crawl.py:298-311`](../../../크롤러/crawl.py) — `data/articles/images/<id>_<i>.<ext>` 이미지 다운로드
- [`src/lib/articles/store.ts:22, 29, 33`](../../../src/lib/articles/store.ts) — 기사 CRUD (`/admin` 편집·삭제 포함)
- [`src/lib/config/settings.ts:74-75`](../../../src/lib/config/settings.ts) — `data/config/settings.json` 저장
- [`src/lib/prompts/store.ts`](../../../src/lib/prompts/store.ts) — 사용자 편집 프롬프트

**Python 이 어떻게든 돌아간다 해도** JSON·이미지 저장 단계에서 `Errno 30 Read-only file system` 으로 실패한다.

게다가 Vercel Serverless는 **각 invocation이 독립된 Lambda 인스턴스**. 한 invocation이 `/tmp`에 썼더라도 다음 호출이 같은 컨테이너에 닿는다는 보장이 없다. 즉 크롤링·읽기가 다른 컨테이너에서 일어나면 데이터가 안 보인다.

### 2.3. 함수 실행 시간 한도 (제약적)

크롤링 한 번에 걸리는 시간:
- 검색 페이지 1회 GET (+ `delay 1s`)
- 기사 N개 GET (+ 각각 delay)
- 기사 N개 OpenAI structured-output 호출 (2-5초/건)
- 이미지 다운로드 (선택적)

**N=5일 때 30-60초**. N=20이면 1-3분.

Vercel 한도 (2026년 6월 기준):
- **Hobby**: 기본 10초, 최대 60초 (function `maxDuration` 설정으로 연장)
- **Pro**: 기본 15초, 최대 800초 (streaming은 별도)

Hobby tier로는 사실상 불가능. Pro라도 N 작게 잡고 `maxDuration` 명시 필요.

### 2.4. SSE 스트리밍 (Vercel은 지원하지만 서버 시간을 소모)

- Vercel는 `text/event-stream` 응답을 지원하지만, 함수의 총 실행 시간은 위 한도에 묶임
- 30초 이상 흐르는 스트림은 잘림

---

## 3. 해결책 4가지

각각 다른 trade-off. 데모 용도에 따라 선택.

### Solution A: 로컬 전용 유지 + 결과만 deploy (1-2시간)

**아이디어**: 크롤러는 **개발자 노트북에서만 돈다**. 크롤링 결과(`data/articles/*.json` + 이미지)는 git에 commit 해서 Vercel은 read-only로 서빙. Vercel의 `/settings` 페이지에서는 크롤러 UI를 숨기거나 "Local development only" 안내.

- **장점**: 코드 거의 그대로. 데모할 때 미리 좋은 데이터셋 준비해두고 발표 흐름 통제 가능
- **단점**: "Vercel에서 라이브로 크롤링 시연" 불가
- **작업량**: 작음
- **TPC 강의 데모에 적합한가**: ★★★★★ — 시연 안정성 최우선이면 이게 정답

**필요한 작업**:
1. `data/articles/`를 git에 commit (`.gitignore` 정리)
2. CrawlerPanel에 환경 가드: `process.env.VERCEL` 또는 `NEXT_PUBLIC_DISABLE_CRAWLER` 로 감춤
3. README에 "크롤러는 로컬 전용, 결과만 deploy 됨" 명시

### Solution B: 크롤러를 TS로 포팅 + 외부 저장소 (1-2일)

**아이디어**: Python을 버리고 Node.js로 동일 로직 재구현. 파일 시스템 대신 Vercel Blob (이미지) + Vercel KV/Postgres (JSON) 또는 Supabase 같은 외부 서비스.

- **장점**: Vercel에서 "정말로" 라이브 크롤링 시연 가능. 기능 완전 동등.
- **단점**:
  - Python 코드 전부 재작성 (`cheerio` 라이브러리로 BeautifulSoup 대체)
  - 기사·이미지 저장 레이어 전부 외부 서비스로 마이그레이션
  - 함수 시간 제한 → 크롤링 개수 작게 (3개 내외) 또는 background job 패턴 (예: Inngest, QStash)
  - 비용 발생 (Vercel Blob/KV 무료 한도 초과 시)
- **작업량**: 큼
- **TPC 강의 데모에 적합한가**: ★★★ — "라이브로 보여주는 게 본질"이라면 가치 있음

**필요한 작업**:
1. `src/lib/crawler/` 신규 TS 모듈 — 검색·기사 추출·이미지 다운로드·LLM 정리
2. `articleStore` 인터페이스를 유지하면서 구현체를 `vercelBlobStore` / `kvStore` 로 swap
3. `settingsStore`, `promptStore` 도 같이 외부화
4. `/api/crawl` route: spawn 제거, TS 모듈 직접 호출. 스트림은 그대로.
5. `vercel.json` 또는 route 옵션으로 `maxDuration` 늘리기
6. 환경변수 `BLOB_READ_WRITE_TOKEN`, `KV_REST_API_URL` 등 세팅

### Solution C: 외부 워커 + Vercel은 read-only (1일)

**아이디어**: Python 크롤러는 **별도 서비스**에서 돈다 — GitHub Actions cron, Railway/Render container, 또는 PC에서 수동 트리거. 결과를 외부 storage(S3, Supabase 등)에 쓰면 Vercel app은 거기서 읽기만.

- **장점**: 크롤러 코드 변경 거의 없음 (Python 그대로). 시연 시점에 별도 워커 트리거 → 잠시 뒤 Vercel UI에 결과 표시
- **단점**: 인프라 추가 (GitHub Actions 워크플로 또는 컨테이너 운영)
- **작업량**: 중간
- **TPC 강의 데모에 적합한가**: ★★ — "여기 다른 서비스에서 돌리고 있어요" 설명 단계가 추가됨

**필요한 작업**:
1. 외부 워커 환경 (GitHub Actions cron OR Railway/Render container)
2. 워커에서 Python 그대로 실행, 결과를 S3/Supabase에 PUT
3. Vercel app `articleStore` 를 그 외부 storage 읽기 어댑터로 교체
4. Vercel `/api/crawl` 은 워커 webhook 호출만 (선택, 트리거 시연용)

### Solution D: Vercel Python Functions (보장 안 됨, 추천 X)

**아이디어**: Vercel에 Python 런타임도 있음 (`@vercel/python`). 같은 프로젝트 안에 `api/crawl.py` 같은 식으로 배치.

- **장점**: Python 코드 거의 그대로
- **단점**:
  - Next.js App Router와 같은 프로젝트에 Python 함수 섞기 = 빌드 복잡도 ↑
  - 파일 시스템 문제 그대로 (역시 외부 storage 필수)
  - 시간 제한 그대로
- **결론**: Solution B 와 비교했을 때 이점이 거의 없음. **추천 안 함**.

---

## 4. 추천

**용도가 "TPC 강의 데모"라면 Solution A가 압도적으로 우수**. 이유:

1. 발표 자리에서 라이브 크롤링은 위험 — 네트워크·네이버 응답·OpenAI rate limit·시간 한도 모두 변수
2. 미리 잘 준비된 데이터셋 5-10개로 답변 흐름이 훨씬 깔끔
3. "이 데모는 로컬에서 크롤러를 돌려 수집한 기사들로 동작합니다 — 크롤러 코드도 같이 보여드릴게요" 라고 코드 자체를 보여주면 같은 교육 가치

**"꼭 Vercel에서 라이브로 크롤링이 돌아야 한다"면 Solution B**. 작업량은 크지만 깨끗한 결과.

Solution C는 시연 시 별도 워커를 같이 보여줘야 해서 청중에게 혼란. 가장 마지막 선택.

---

## 5. 비범위 (Out of scope)

- LLM 호출 (`/api/chat`) 의 Vercel 동작 — OpenAI/Anthropic/Gemini 모두 외부 API라 Vercel 서버에서 그대로 가능. 단, 시드 데이터(`data/articles/`)가 없으면 답할 기사가 없음 → Solution A 라도 시드 데이터 commit은 필수.
- 시드 기사의 `data.config.ts` 경로 변경 — `process.cwd()` 기반이라 Vercel deployment bundle에 포함되면 read-only로 읽기는 잘 됨. 쓰기만 막힘.
- 인증·인가 — 현재 demo라 없음. 운영용이면 별개 spec 필요.

---

## 6. 다음 단계

사용자 결정 필요:
- [ ] Solution **A** (로컬 전용, 시드 데이터 deploy) — 추천
- [ ] Solution **B** (TS 포팅 + 외부 저장)
- [ ] Solution **C** (외부 워커)
- [ ] Solution **D** (Vercel Python) — 추천 안 함

선택 알려주시면 같은 브랜치에서 후속 작업 들어갑니다.
