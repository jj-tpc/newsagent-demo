# 설정 메뉴 (모델 선택 + 프롬프트 관리) — 설계 (Design Spec)

- 작성일: 2026-06-08
- 상태: 초안 (사용자 검토 대기)
- 선행: [신문 에이전트 데모](2026-06-08-newsagent-demo-design.md) (이미 main에 머지됨)

## 1. 목적 / 개요

기존 신문 에이전트 데모에 **설정 메뉴**를 추가한다. 설정 페이지에서:
1. **LLM 프로바이더 및 모델 선택** (Anthropic / OpenAI / Google)
2. **프롬프트 수정 및 반영** (select / answer 2종)

모델은 2026-06 기준 최신 라인업 중에서 선택 가능하게 하고, 프롬프트는 코드가 아닌
**파일**로 보관한다(기본값 템플릿도 파일). 설정 페이지가 프로바이더·모델·프롬프트의
**단일 소스**가 된다 — 챗봇 메인의 기존 프로바이더 드롭다운은 제거한다.

## 2. 저장 구조

```
prompts/defaults/            # git 추적, 읽기전용 기본 템플릿
  select.md
  answer.md
data/config/settings.json    # 런타임, 사용자 설정 (없으면 기본값)
data/prompts/                # 런타임, 사용자 편집본 (없으면 defaults 사용)
  select.md
  answer.md
```

`settings.json`:
```json
{
  "provider": "anthropic",
  "models": { "anthropic": "claude-sonnet-4-6", "openai": "gpt-5.4-mini", "gemini": "gemini-3.5-flash" }
}
```

- `data/config/`, `data/prompts/`는 런타임 생성. `data/`는 이미 git 추적 대상이지만,
  이 두 디렉토리는 사용자 편집본이므로 빈 상태를 유지하고 `.gitkeep`만 추적한다(편집본 JSON/MD는 커밋하지 않음 — 단, 데모 편의상 강제 커밋하지 않는다).

## 3. 모델 카탈로그 (2026-06 기준, 코드 상수)

`src/lib/llm/models.ts`:

```ts
import type { ProviderName } from "./types";
export interface ModelOption { id: string; label: string; }
export const MODEL_CATALOG: Record<ProviderName, ModelOption[]> = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    { id: "gpt-5.5", label: "GPT-5.5" },
    { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    { id: "gpt-5.2", label: "GPT-5.2" },
  ],
  gemini: [
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  ],
};
export const DEFAULT_PROVIDER: ProviderName = "anthropic";
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.4-mini",
  gemini: "gemini-3.5-flash",
};
```

- 각 배열의 첫 항목이 해당 프로바이더 기본 모델(`DEFAULT_MODELS`와 일치).
- 설정값이 카탈로그에 없으면 기본값으로 폴백.

## 4. 프롬프트 템플릿

기본 템플릿(현재 문구 유지 + 플레이스홀더). `prompts/defaults/select.md`:
```
다음은 사용자 질문과, 보유한 신문기사 후보(제목·태그)다.
질문을 검색에 적합하게 한 문장으로 다듬고(polishedQuery),
답변에 참고할 기사 id 목록(selectedIds)을 고르라.
반드시 JSON만 출력: {"polishedQuery": string, "selectedIds": string[]}

질문: {{question}}
후보 기사:
{{candidates}}
```
`prompts/defaults/answer.md`:
```
아래 신문기사들만 근거로 사용자 질문에 한국어로 답하라.
본문에 관련 이미지를 넣고 싶으면 `![캡션](파일명)` 형식으로 표기하라.
근거가 없으면 모른다고 답하라.

질문: {{question}}
참고 기사:
{{articles}}
```

- 플레이스홀더: select → `{{question}}`, `{{candidates}}` / answer → `{{question}}`, `{{articles}}`.
- 후보 목록(`{{candidates}}`)과 기사 블록(`{{articles}}`)은 코드에서 렌더한 문자열로 치환.
  렌더 형식은 현재 구현과 동일:
  - candidates 한 줄: `- id=<id> | 제목="<title>" | 태그=[<tag, ...>]`
  - article 블록: `### <title> (id=<id>, <date>)\n<content>\n이미지:\n  - 이미지 <filename>: <caption>` (이미지별 줄)
- 프롬프트는 **모든 프로바이더 공용**.

## 5. 코어 모듈

### 5.1 settings 스토어 — `src/lib/config/settings.ts`
```ts
import type { ProviderName } from "../llm/types";
export interface Settings {
  provider: ProviderName;
  models: Record<ProviderName, string>;
}
export function makeSettingsStore(file: string): {
  get(): Promise<Settings>;          // 파일 없거나 깨지면 기본값, 누락 키 병합, 카탈로그 외 모델은 기본값으로 교정
  save(patch: Partial<Settings>): Promise<Settings>; // 병합 저장, 저장 전 검증
};
export const settingsStore; // = makeSettingsStore(data/config/settings.json)
```
- `get()`: 기본값(DEFAULT_PROVIDER/DEFAULT_MODELS)에 파일 값을 얕게 병합. `provider`가 유효하지 않으면 기본 provider. 각 `models[p]`가 `MODEL_CATALOG[p]`에 없으면 `DEFAULT_MODELS[p]`로 교정.
- `save(patch)`: 현재값과 병합 → 동일 검증 → 파일 기록 → 저장된 값 반환.

### 5.2 prompt 스토어 — `src/lib/prompts/store.ts`
```ts
export type PromptName = "select" | "answer";
export function makePromptStore(activeDir: string, defaultsDir: string): {
  getDefault(name: PromptName): Promise<string>;
  get(name: PromptName): Promise<string>;     // active 있으면 active, 없으면 default
  isOverridden(name: PromptName): Promise<boolean>;
  set(name: PromptName, text: string): Promise<void>;  // active 디렉토리에 기록
  reset(name: PromptName): Promise<void>;     // active 파일 삭제 (default로 복귀)
};
export const promptStore; // = makePromptStore(data/prompts, prompts/defaults)
```

### 5.3 프롬프트 빌더 (수정) — `src/lib/llm/prompts.ts`
```ts
export async function buildSelectPrompt(question, candidates): Promise<string>;
export async function buildAnswerPrompt(question, articles): Promise<string>;
```
- `promptStore.get(name)`으로 템플릿을 읽고, candidates/articles를 위 형식으로 렌더해
  `{{question}}`/`{{candidates}}`/`{{articles}}`를 치환.
- 기존 동기 `selectPrompt`/`answerPrompt`는 제거(또는 내부 순수 렌더 헬퍼 `renderCandidates`/`renderArticles`로 분리해 단위 테스트).

### 5.4 LlmProvider 인터페이스 (수정) — `src/lib/llm/types.ts`
```ts
export interface LlmProvider {
  selectArticles(question: string, candidates: ArticleCandidate[], model: string): Promise<SelectResult>;
  answer(question: string, articles: ArticleContext[], model: string): Promise<string>;
}
```
- `model`을 **마지막 인자**로 추가(기존 인자 위치 유지 → 테스트 영향 최소화).

### 5.5 어댑터 3종 (수정)
- 하드코딩 `const MODEL` 제거. 전달받은 `model` 사용.
- `await buildSelectPrompt(...)` / `await buildAnswerPrompt(...)` 사용.
- JSON 파싱/폴백 로직은 현행 유지.

### 5.6 오케스트레이터 (수정) — `src/lib/chat/orchestrator.ts`
```ts
export async function runChat({ question, provider, model, store }: {
  question: string; provider: LlmProvider; model: string; store: { list(): Promise<Article[]> };
}): Promise<ChatResult>;
```
- `provider.selectArticles(question, candidates, model)` / `provider.answer(question, context, model)` 호출.
- 반환 `ChatResult` 형태 불변.

## 6. API 라우트

- `GET /api/settings` → `{ provider, models, catalog: MODEL_CATALOG }`
- `PUT /api/settings` → body `{ provider?, models? }`, 저장 후 정규화된 `{ provider, models }` 반환
- `GET /api/prompts` → `{ select: { text, overridden }, answer: { text, overridden } }`
- `PUT /api/prompts` → body `{ name, text }`, 저장 후 `{ ok: true }`
- `POST /api/prompts/reset` → body `{ name }`, 기본값 복원 후 `{ text }`(복원된 기본 텍스트)
- `POST /api/chat` (수정) → body `{ question }`만. 서버가 `settingsStore.get()`으로 provider+model 결정:
  `provider = getProvider(settings.provider)`, `model = settings.models[settings.provider]`.

## 7. UI

### `/settings` (신규, client)
- **프로바이더 select** (Anthropic / OpenAI / Google) — 변경 시 모델 드롭다운 갱신.
- **모델 select** — `catalog[provider]`로 채우고 값은 `models[provider]`. 변경 시 해당 provider의 모델로 반영.
- **저장 버튼** — `PUT /api/settings` ( `{ provider, models }` ).
- **프롬프트 편집** — select / answer 각각 `<textarea>` + "저장"(`PUT /api/prompts`) + "기본값으로 초기화"(`POST /api/prompts/reset`, 응답 텍스트로 textarea 갱신). override 여부 표시.
- 컴포넌트: `src/components/settings/` 아래 `ProviderModelPicker.tsx`, `PromptEditor.tsx`, 페이지 `src/app/settings/page.tsx`.

### `ChatWindow` (수정)
- `ProviderSelector` import/사용 제거, `provider` state 제거.
- `send`의 POST body는 `{ question }`만.
- (기존 `ProviderSelector.tsx` 컴포넌트 파일은 더 이상 사용되지 않으므로 삭제.)

### 상단 네비 (수정) — `src/app/layout.tsx`
- 최소 네비 바: `Chat` (`/`) · `Admin` (`/admin`) · `Settings` (`/settings`) 링크.

## 8. 에러 처리 / 비기능

- settings/prompt 파일 부재·파싱 실패 → 기본값으로 안전 폴백(throw 금지).
- 카탈로그 외 모델 ID 저장 시도 → 기본값으로 교정 후 저장.
- LLM 키 미설정/호출 실패 → 기존과 동일하게 `/api/chat`이 `{ error }` 500 반환, UI에 표시.

## 9. 테스트 (TDD 대상)

- `settings.ts`: 기본값 폴백, 누락 키 병합, 카탈로그 외 모델 교정, save 라운드트립.
- `prompts/store.ts`: active 없을 때 default 반환, set 후 active 반환, reset 후 default 복귀, isOverridden.
- `prompts.ts` 빌더: 템플릿 플레이스홀더 치환에 question/candidates/articles 내용 포함(렌더 헬퍼 단위 테스트 + async 빌더 1건).
- `orchestrator.ts`: `model` 인자가 `selectArticles`/`answer`에 그대로 전달되는지(기존 테스트 시그니처 갱신).

## 10. 범위 밖 (YAGNI)

- 프로바이더별 개별 프롬프트(공용 유지).
- 모델 카탈로그의 동적 조회(API로 모델 목록 가져오기) — 정적 상수로 충분.
- 인증/권한, 설정 변경 이력, 멀티 사용자 프로필.
