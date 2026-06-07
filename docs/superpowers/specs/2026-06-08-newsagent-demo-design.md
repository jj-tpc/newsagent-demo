# 신문 에이전트 데모 — 데모 계획서 (Design Spec)

- 작성일: 2026-06-08
- 상태: 초안 (사용자 검토 대기)

## 1. 목적 / 개요

저장된 신문기사를 지식 베이스로 삼아, 사용자의 질문에 대해 **관련 기사를 LLM이
선제적으로 골라 근거로 답변하는 "신문 에이전트" 챗봇 데모**.

핵심 데모 포인트:
- 태그/제목 기반으로 LLM이 **참고할 기사를 스스로 선택**한다.
- 질문을 LLM이 **한 번 폴리싱한 검색어**를 UI에 노출해 "에이전트답게" 보이게 한다.
- 답변에 **출처 기사 카드 + 본문 인라인 이미지(캡션 포함)**를 함께 보여준다.

## 2. 기술 스택

- **Next.js (App Router) 풀스택 단일 프로젝트** — 프론트(챗봇 UI, admin) + 백엔드(API Routes).
- **데이터 저장: 파일시스템 JSON** (별도 DB 없음).
- **LLM: 멀티 프로바이더 선택형** — GPT / Gemini / Anthropic.
  - 공통 인터페이스 뒤에 프로바이더별 어댑터를 둔다.
  - API 키는 서버 환경변수(`.env.local`)로 관리, 클라이언트에 노출하지 않는다.

## 3. 데이터 모델

```
data/
  articles/
    {id}.json          # 기사 1건 = 파일 1개
    images/
      {filename}        # 이미지 파일 (기사당 1개 이상)
```

기사 JSON 스키마:

```json
{
  "id": "2026-0001",
  "title": "기사 제목",
  "content": "본문 텍스트 ...",
  "images": [
    { "filename": "abc.jpg", "caption": "이미지 캡션" }
  ],
  "publishedDate": "2026-06-01",
  "tags": ["경제", "금리", "한국은행"]
}
```

- `tags`는 여러 개. **admin에서 기사 저장 시 사용자가 직접 편집/입력**한다.
- 이미지는 `data/articles/images/`에 쌓고, JSON의 `images[].filename`으로 참조한다.

## 4. 챗봇 흐름 (데모의 핵심)

2단계 LLM 흐름:

1. **LLM 호출 #1 — 질의 폴리싱 + 기사 선택**
   - 입력: 사용자 질문 + **전체 기사의 제목·태그만** (본문 제외, 경량)
   - 출력(JSON): `{ "polishedQuery": "...", "selectedIds": ["...", "..."] }`
     - `polishedQuery`: 사용자 질문을 검색에 맞게 한 번 다듬은 문장
     - `selectedIds`: 참고할 기사 ID 목록
2. **UI 노출**: `"다음의 검색어로 찾아보고 있습니다: {polishedQuery}"` 를 답변 생성 중 표시.
3. **기사 전문 주입**: `selectedIds`에 해당하는 기사의 본문 + 이미지 정보(파일명/캡션)를 로드.
4. **LLM 호출 #2 — 답변 생성**
   - 입력: 사용자 질문 + 선택된 기사 전문
   - 출력: 출처를 인용한 답변 텍스트 + 인라인 이미지 마커
5. **응답 구성**:
   - 답변 텍스트
   - **출처 기사 카드** (제목 / 대표 이미지 / 발행일, 클릭 시 원문 보기)
   - **본문 인라인 이미지** (캡션 포함)

엣지 케이스:
- `selectedIds`가 비면 "관련 기사를 찾지 못했습니다" 안내 (일반 답변 폴백 여부는 구현 시 토글).
- LLM 키 미설정/호출 실패 시 명확한 에러 메시지 + (옵션) 목업 응답 폴백.

## 5. 페이지 / 컴포넌트

### `/` — 챗봇 메인 (ChatGPT 스타일)
- 빈 상태에 **데모 프롬프트 카드 3~4개** → 클릭 시 자동 입력·전송.
- 상단에 **프로바이더 선택 드롭다운** (GPT / Gemini / Anthropic).
- 컴포넌트: `ChatWindow`, `MessageList`, `MessageBubble`, `SourceCard`,
  `InlineImage`, `PromptCard`, `Composer`, `ProviderSelector`, `SearchingIndicator`(폴리싱 검색어 노출).

### `/admin` — 기사 관리
- 기사 목록 테이블(보기) + 편집/추가 폼.
- 폼 필드: 제목 · 본문 · **태그(직접 편집)** · 이미지(+캡션) · 발행일.
- 이미지 업로드 → `data/articles/images/`에 저장.
- 컴포넌트: `ArticleTable`, `ArticleEditor`, `ImageUploader`, `TagEditor`.

## 6. API Routes

- `POST /api/chat` — 위 2단계 흐름 오케스트레이션 (프로바이더 파라미터 포함).
- `GET /api/articles` — 목록, `GET /api/articles/[id]` — 단건.
- `POST /api/articles` — 추가, `PUT /api/articles/[id]` — 수정, `DELETE /api/articles/[id]` — 삭제.
- 이미지 서빙 — `/api/images/[filename]` (또는 `public/` 정적 서빙).
- 태그 카탈로그가 필요하면 `GET /api/tags` (옵션).

## 7. LLM 프로바이더 추상화

```
lib/llm/
  index.ts        # provider 선택 → 공통 호출 인터페이스
  anthropic.ts
  openai.ts
  gemini.ts
  types.ts        # { polishedQuery, selectedIds } 등 구조화 출력 스키마
```

- 공통 인터페이스: `selectArticles(question, candidates)`, `answer(question, articles)`.
- 각 어댑터가 자사 SDK 호출 + 구조화 출력(JSON) 파싱을 담당.

## 8. 데모 안정성 / 비기능 요구

- 기사 수가 적다는 전제 → 제목·태그 경량 주입으로 1단계 비용 최소화.
- LLM 키는 서버에서만 사용, 클라이언트 노출 금지.
- 에러/빈 결과에 대한 사용자 친화적 메시지.

## 9. 범위 밖 (YAGNI)

- 사용자 인증/권한 (admin 공개 데모로 가정).
- 벡터 임베딩/시맨틱 검색 (태그·제목 기반으로 충분).
- 다국어, 대화 영속 저장(세션 히스토리 DB) 등은 데모 범위 밖.
