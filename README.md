# 신문 에이전트 데모

한국어 뉴스 기사를 모아두고 LLM이 답해주는 데모. Naver 모바일 뉴스 크롤링 →
기사 저장 → 챗에서 참조 답변 + 출처/이미지 표시.

## 로컬 개발

```bash
npm install
npm run dev
```

환경 변수 (`.env.local`):

```env
# LLM (최소 하나)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...

# 크롤러는 OpenAI로 본문 정리 — OPENAI_API_KEY 필수
```

로컬에서 BLOB 토큰이 없으면 모든 데이터(기사 JSON, 이미지, 설정, 사용자 프롬프트)는 `data/` 디렉토리에 직접 저장됩니다.

## Vercel 배포

이 앱은 두 가지 모드로 동작:
- **로컬**: `data/` 디렉토리 read/write
- **Vercel** (또는 BLOB 토큰 있는 환경): Vercel Blob bucket에 read/write

Vercel에 deploy 할 때 필요한 것:

### 1. Vercel Blob bucket 생성

Vercel 대시보드 → 프로젝트 → **Storage** → **Create Database** → **Blob** 선택.
생성하면 자동으로 `BLOB_READ_WRITE_TOKEN`이 프로젝트 환경변수에 추가됩니다.

### 2. 환경변수 확인

Vercel 프로젝트 설정 → Environment Variables 에서 다음을 모두 채워야 합니다:

| Key | 용도 |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Blob bucket 자동 생성됨 (1번 단계에서) |
| `OPENAI_API_KEY` | 크롤러 본문 정리 |
| `ANTHROPIC_API_KEY` | 챗 답변 기본 모델 |
| `GEMINI_API_KEY` | (선택) Gemini 사용 시 |

### 3. 첫 배포 후

- 시드 기사가 비어 있다면 `/settings` → **뉴스 크롤링**에서 키워드 입력 → "기사 가져오기"로 채워주세요. Vercel Hobby tier 함수 한도(60초)에 맞춰 한 번에 최대 **7건**까지 크롤링됩니다.
- 가져온 기사는 곧바로 `/admin`에 노출됩니다.
- 크롤러는 동일 URL을 자동으로 dedup 합니다 — 같은 키워드를 두 번 돌려도 중복 저장 안 됨.

### 한도 / 비용

- **Vercel Function**: Hobby tier 60초 → 안전한 크롤 개수 1~7건
- **Vercel Blob**: 무료 한도 ~1GB 스토리지 / 100k 요청·월. 데모 사용량으로는 거의 안 닿음
- **LLM 호출**: 별도 — OpenAI/Anthropic/Gemini 각 계정에서 직접 청구

## 아키텍처

```
src/
├── app/                      Next.js App Router
│   ├── api/
│   │   ├── chat/             SSE 스트리밍 답변
│   │   ├── crawl/            SSE 크롤러 (TS in-process, Phase B)
│   │   ├── articles/         CRUD + crawled 일괄 삭제
│   │   ├── images/[filename] 이미지 직결 (Blob redirect / fs stream)
│   │   ├── settings/         AI 모델 / 답변 한도
│   │   └── prompts/          사용자 편집 프롬프트
│   ├── (chat) page.tsx
│   ├── admin/                기사 관리 (CRUD + 빈 상태)
│   └── settings/             에디터 도구 (모델/한도/프롬프트/크롤링)
├── components/               UI
└── lib/
    ├── storage/              FileStore — LocalFs + VercelBlob 두 백엔드
    ├── articles/store.ts     기사 CRUD
    ├── config/settings.ts    AI 모델·max 한도
    ├── prompts/store.ts      사용자 프롬프트(편집) + 기본 프롬프트(번들)
    ├── chat/orchestrator.ts  selectArticles → answer 흐름 + SSE generator
    ├── llm/                  Anthropic / OpenAI / Gemini provider
    └── crawler/              Naver 검색 → 본문/캡션 추출 → 정리 → 저장
```

`크롤러/` (Python) 디렉토리는 로컬 CLI 도구로 보존됩니다. Vercel에서는 사용되지 않으며,
TS 크롤러(`src/lib/crawler/`)와 같은 결과를 만듭니다.

## 디자인 컨텍스트

`.impeccable.md` 참조 — Editorial / 신문지 톤. 차분한 / 신뢰감 / 전통적.

## 라이센스

(미정)
