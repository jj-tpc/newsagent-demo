# 크롤러 UI (Settings 페이지) — 설계 (Design Spec)

- 작성일: 2026-06-08
- 상태: 초안 (사용자 승인 완료)
- 선행: [Naver 크롤러](2026-06-08-naver-crawler-design.md)

## 1. 목적

기존 Settings 페이지(`/settings`)에 "뉴스 크롤링" 섹션을 추가해 키워드/개수를
입력하고 버튼 한 번으로 [`크롤러/crawl.py`](../../../크롤러/crawl.py)를 실행할 수
있게 한다. 실행 중 로그는 SSE로 실시간 스트림.

## 2. 변경 파일

- 신규 `src/app/api/crawl/route.ts` — GET SSE 핸들러
- 신규 `src/components/settings/CrawlerPanel.tsx` — UI 섹션 컴포넌트
- 수정 `src/app/settings/page.tsx` — 섹션 추가

## 3. UI

```
┌─ 뉴스 크롤링 ───────────────────────────────────────┐
│ 키워드: [홍명보_______________________________]      │
│ 개수:   [5__]                                       │
│ [크롤링 실행]                                       │
│                                                     │
│ ┌─ 로그 ─────────────────────────────────────────┐  │
│ │ [search] GET https://...                       │  │
│ │ [search] found 5 naver-hosted article links    │  │
│ │ [article] GET https://...                      │  │
│ │ [save] 크롤러/output/2026-0004.json (images...│  │
│ │ 완료: 성공 5건, 실패 0건                       │  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- 키워드: text input
- 개수: number input (1-20)
- 버튼: 실행 중에는 disabled + "실행 중…" 라벨
- 로그: `<pre>` 스크롤 박스, 새 줄 들어오면 자동 스크롤 to bottom
- 실행 후 결과는 로그에만 남고 상태 텍스트(예: "완료" / "실패") 별도 표시 안 함 (로그 마지막 줄에 어차피 포함)

## 4. API: `GET /api/crawl?keyword=K&count=N`

- 응답 헤더: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- 클라이언트는 `EventSource`로 구독
- 서버는 Python 자식 프로세스를 spawn하고 stdout/stderr 라인을 SSE 이벤트로 흘림
- 이벤트 종류:
  - `data: <line>\n\n` — 일반 로그 라인
  - `event: done\ndata: {exitCode: number}\n\n` — 프로세스 종료
  - `event: error\ndata: <message>\n\n` — 서버 측 에러 (spawn 실패 등)

### 입력 검증

- `keyword`: 필수, 1-50자, 화이트스페이스만은 안 됨
- `count`: 1-20 사이 정수, 기본 5
- 검증 실패 시 400 응답 (SSE 시작 전)

### Python 실행

- `child_process.spawn` 사용 (`exec` 아님 — shell 미사용으로 안전)
- Windows: `py 크롤러/crawl.py --keyword <K> --count <N>`
- 기타 OS: `python3 크롤러/crawl.py ...`
- `cwd`는 프로젝트 루트
- 환경변수: `process.env` 그대로 전달 (`OPENAI_API_KEY` 포함)
- stdin은 닫음

### 스트리밍

- stdout / stderr 모두 `\n` 단위로 잘라서 SSE data 이벤트로 전달
- 한 라인이 너무 길면 그대로 보냄 (잘라내기 없음)
- 클라이언트 연결 끊김(abort)시 자식 프로세스 kill

## 5. CrawlerPanel 컴포넌트

```tsx
function CrawlerPanel() {
  const [keyword, setKeyword] = useState("홍명보");
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  async function run() {
    setLogs([]);
    setRunning(true);
    const url = `/api/crawl?keyword=${encodeURIComponent(keyword)}&count=${count}`;
    const es = new EventSource(url);
    es.onmessage = (e) => setLogs(l => [...l, e.data]);
    es.addEventListener("done", (e) => {
      const { exitCode } = JSON.parse(e.data);
      setLogs(l => [...l, `\n[exit ${exitCode}]`]);
      setRunning(false);
      es.close();
    });
    es.addEventListener("error", (e) => {
      // 서버 에러 또는 연결 끊김
      setRunning(false);
      es.close();
    });
  }
  ...
}
```

자동 스크롤은 `<pre>`에 `ref`를 걸고 `useEffect`로 `scrollTop = scrollHeight`.

## 6. OPENAI_API_KEY 처리

- Python 스크립트 자체가 키 없으면 즉시 에러 + exit 1
- UI는 그 에러 로그를 그대로 보여줌 (별도 처리 없음)
- 사용자가 `.env`에 `OPENAI_API_KEY=sk-...` 추가 후 dev 서버 재시작 필요

## 7. 보안

- `spawn`을 인자 배열 형태로 호출 → shell injection 방지
- 키워드 길이 제한 (50자)
- count 범위 제한 (1-20)
- 동시 실행은 별도 제어 안 함 — 두 번 누르면 두 개 돌아감 (데모 범위)

## 8. 비범위

- 진행률 progress bar
- 결과 미리보기 (저장된 JSON 표시)
- 백그라운드 큐 / 작업 히스토리
- 인증 / 권한
- 프로덕션 배포에서 Python 런타임 준비 (로컬 dev 전제)
