# 설정 메뉴 (모델 선택 + 프롬프트 관리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신문 에이전트 데모에 설정 페이지를 추가해 LLM 프로바이더·모델 선택과 프롬프트(파일 기반) 수정을 가능하게 한다.

**Architecture:** 모델 카탈로그·기본값은 코드 상수, 사용자 설정은 `data/config/settings.json`, 프롬프트 기본 템플릿은 `prompts/defaults/`(코드 추적)·편집본은 `data/prompts/`(런타임). 프롬프트 빌더는 async로 바뀌어 템플릿 파일을 읽고 데이터를 치환한다. `LlmProvider`는 `model` 인자를 받고, `/api/chat`은 settings에서 provider+model을 읽는다. 설정 페이지가 단일 소스이며 챗봇 메인의 프로바이더 드롭다운은 제거된다.

**Tech Stack:** Next.js 16 (App Router, TS), React, Vitest, 기존 LLM SDK (anthropic/openai/google).

---

## 파일 구조

```
prompts/defaults/select.md, answer.md           # 신규, 기본 템플릿 (추적)
data/config/.gitkeep, data/prompts/.gitkeep      # 신규, 런타임 디렉토리
src/lib/llm/models.ts                            # 신규, MODEL_CATALOG + 기본값
src/lib/config/settings.ts                       # 신규, settings 스토어
src/lib/prompts/store.ts                         # 신규, prompt 파일 스토어
src/lib/llm/prompts.ts                           # 수정, async 빌더 + 렌더 헬퍼
src/lib/llm/types.ts                             # 수정, LlmProvider에 model 인자
src/lib/llm/anthropic.ts, openai.ts, gemini.ts   # 수정, model 인자 + async 빌더
src/lib/chat/orchestrator.ts                     # 수정, runChat에 model
src/app/api/settings/route.ts                    # 신규, GET/PUT
src/app/api/prompts/route.ts                     # 신규, GET/PUT
src/app/api/prompts/reset/route.ts               # 신규, POST
src/app/api/chat/route.ts                        # 수정, settings 사용
src/components/settings/ProviderModelPicker.tsx  # 신규
src/components/settings/PromptEditor.tsx         # 신규
src/app/settings/page.tsx                        # 신규
src/components/chat/ChatWindow.tsx               # 수정, 드롭다운 제거
src/components/chat/ProviderSelector.tsx         # 삭제
src/app/layout.tsx                               # 수정, 네비 추가
```

책임:
- `models.ts` — 순수 상수(카탈로그/기본값). 의존성 없음.
- `config/settings.ts` — settings.json 읽기/검증/쓰기. 카탈로그에만 의존.
- `prompts/store.ts` — 프롬프트 파일 active/default 해석.
- `llm/prompts.ts` — 템플릿 + 데이터 → 최종 프롬프트 문자열(렌더 헬퍼는 순수/동기, 빌더는 async).
- 어댑터 — model 받아 SDK 호출. 프롬프트 빌더 호출.
- API 라우트 — HTTP 경계. lib 호출.
- settings 컴포넌트 — 표시/입력. 패칭은 page에서.

---

## Task 1: 모델 카탈로그 상수

**Files:**
- Create: `src/lib/llm/models.ts`
- Test: `src/lib/llm/models.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/llm/models.test.ts`:
```ts
import { it, expect } from "vitest";
import { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODELS } from "./models";

it("each provider's default model is present in its catalog", () => {
  for (const p of ["anthropic", "openai", "gemini"] as const) {
    const ids = MODEL_CATALOG[p].map((m) => m.id);
    expect(ids).toContain(DEFAULT_MODELS[p]);
  }
});
it("default provider is anthropic with sonnet 4.6 default", () => {
  expect(DEFAULT_PROVIDER).toBe("anthropic");
  expect(DEFAULT_MODELS.anthropic).toBe("claude-sonnet-4-6");
  expect(DEFAULT_MODELS.openai).toBe("gpt-5.4-mini");
  expect(DEFAULT_MODELS.gemini).toBe("gemini-3.5-flash");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- models`
Expected: FAIL (module not found).

- [ ] **Step 3: 구현**

Create `src/lib/llm/models.ts`:
```ts
import type { ProviderName } from "./types";

export interface ModelOption {
  id: string;
  label: string;
}

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

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- models`
Expected: PASS (2 tests).
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/models.ts src/lib/llm/models.test.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: llm model catalog and defaults

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: settings 스토어

**Files:**
- Create: `src/lib/config/settings.ts`
- Test: `src/lib/config/settings.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/config/settings.test.ts`:
```ts
import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeSettingsStore } from "./settings";

let dir: string;
let file: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "settings-")); file = path.join(dir, "settings.json"); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

it("returns defaults when file is absent", async () => {
  const store = makeSettingsStore(file);
  const s = await store.get();
  expect(s.provider).toBe("anthropic");
  expect(s.models.openai).toBe("gpt-5.4-mini");
});

it("merges missing keys and corrects out-of-catalog models to defaults", async () => {
  fs.writeFileSync(file, JSON.stringify({ provider: "openai", models: { openai: "made-up-model" } }));
  const store = makeSettingsStore(file);
  const s = await store.get();
  expect(s.provider).toBe("openai");                 // valid provider kept
  expect(s.models.openai).toBe("gpt-5.4-mini");       // invalid model corrected
  expect(s.models.gemini).toBe("gemini-3.5-flash");   // missing key filled
});

it("falls back to default provider when provider invalid", async () => {
  fs.writeFileSync(file, JSON.stringify({ provider: "bogus" }));
  const store = makeSettingsStore(file);
  expect((await store.get()).provider).toBe("anthropic");
});

it("save merges patch, validates, persists, and returns normalized settings", async () => {
  const store = makeSettingsStore(file);
  const saved = await store.save({ provider: "gemini", models: { gemini: "gemini-3.1-pro" } as never });
  expect(saved.provider).toBe("gemini");
  expect(saved.models.gemini).toBe("gemini-3.1-pro");
  // persisted
  const reread = await makeSettingsStore(file).get();
  expect(reread.provider).toBe("gemini");
  expect(reread.models.gemini).toBe("gemini-3.1-pro");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- settings`
Expected: FAIL (module not found).

- [ ] **Step 3: 구현**

Create `src/lib/config/settings.ts`:
```ts
import fs from "node:fs/promises";
import path from "node:path";
import type { ProviderName } from "../llm/types";
import { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODELS } from "../llm/models";

export interface Settings {
  provider: ProviderName;
  models: Record<ProviderName, string>;
}

const PROVIDERS: ProviderName[] = ["anthropic", "openai", "gemini"];

function normalize(raw: Partial<Settings> | null | undefined): Settings {
  const provider = PROVIDERS.includes(raw?.provider as ProviderName)
    ? (raw!.provider as ProviderName)
    : DEFAULT_PROVIDER;
  const models = {} as Record<ProviderName, string>;
  for (const p of PROVIDERS) {
    const wanted = raw?.models?.[p];
    const valid = wanted && MODEL_CATALOG[p].some((m) => m.id === wanted);
    models[p] = valid ? (wanted as string) : DEFAULT_MODELS[p];
  }
  return { provider, models };
}

export function makeSettingsStore(file: string) {
  return {
    async get(): Promise<Settings> {
      try {
        const raw = JSON.parse(await fs.readFile(file, "utf8")) as Partial<Settings>;
        return normalize(raw);
      } catch {
        return normalize(null);
      }
    },
    async save(patch: Partial<Settings>): Promise<Settings> {
      const cur = await this.get();
      const merged = normalize({
        provider: patch.provider ?? cur.provider,
        models: { ...cur.models, ...(patch.models ?? {}) },
      });
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(merged, null, 2), "utf8");
      return merged;
    },
  };
}

export const settingsStore = makeSettingsStore(
  path.join(process.cwd(), "data", "config", "settings.json"),
);
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- settings`
Expected: PASS (4 tests).
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/config
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: settings store with catalog validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 기본 프롬프트 템플릿 파일 + prompt 스토어

**Files:**
- Create: `prompts/defaults/select.md`
- Create: `prompts/defaults/answer.md`
- Create: `src/lib/prompts/store.ts`
- Test: `src/lib/prompts/store.test.ts`

- [ ] **Step 1: 기본 템플릿 파일 작성**

Create `prompts/defaults/select.md`:
```
다음은 사용자 질문과, 보유한 신문기사 후보(제목·태그)다.
질문을 검색에 적합하게 한 문장으로 다듬고(polishedQuery),
답변에 참고할 기사 id 목록(selectedIds)을 고르라.
반드시 JSON만 출력: {"polishedQuery": string, "selectedIds": string[]}

질문: {{question}}
후보 기사:
{{candidates}}
```
Create `prompts/defaults/answer.md`:
```
아래 신문기사들만 근거로 사용자 질문에 한국어로 답하라.
본문에 관련 이미지를 넣고 싶으면 `![캡션](파일명)` 형식으로 표기하라.
근거가 없으면 모른다고 답하라.

질문: {{question}}
참고 기사:
{{articles}}
```

- [ ] **Step 2: 실패 테스트 작성**

Create `src/lib/prompts/store.test.ts`:
```ts
import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makePromptStore } from "./store";

let root: string, activeDir: string, defaultsDir: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-"));
  activeDir = path.join(root, "active");
  defaultsDir = path.join(root, "defaults");
  fs.mkdirSync(defaultsDir, { recursive: true });
  fs.writeFileSync(path.join(defaultsDir, "select.md"), "DEFAULT SELECT {{question}}");
  fs.writeFileSync(path.join(defaultsDir, "answer.md"), "DEFAULT ANSWER {{question}}");
});
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

it("returns default when no active override", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  expect(await store.get("select")).toContain("DEFAULT SELECT");
  expect(await store.isOverridden("select")).toBe(false);
});

it("returns active after set, and reports overridden", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("select", "CUSTOM {{question}}");
  expect(await store.get("select")).toBe("CUSTOM {{question}}");
  expect(await store.isOverridden("select")).toBe(true);
});

it("reset removes active override and returns to default", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("answer", "CUSTOM");
  await store.reset("answer");
  expect(await store.isOverridden("answer")).toBe(false);
  expect(await store.get("answer")).toContain("DEFAULT ANSWER");
});

it("getDefault always returns the default text", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("select", "CUSTOM");
  expect(await store.getDefault("select")).toContain("DEFAULT SELECT");
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- prompts/store`
Expected: FAIL (module not found).

- [ ] **Step 4: 구현**

Create `src/lib/prompts/store.ts`:
```ts
import fs from "node:fs/promises";
import path from "node:path";

export type PromptName = "select" | "answer";

export function makePromptStore(activeDir: string, defaultsDir: string) {
  const activeFile = (n: PromptName) => path.join(activeDir, `${n}.md`);
  const defaultFile = (n: PromptName) => path.join(defaultsDir, `${n}.md`);
  return {
    async getDefault(name: PromptName): Promise<string> {
      return fs.readFile(defaultFile(name), "utf8");
    },
    async isOverridden(name: PromptName): Promise<boolean> {
      try { await fs.access(activeFile(name)); return true; } catch { return false; }
    },
    async get(name: PromptName): Promise<string> {
      try { return await fs.readFile(activeFile(name), "utf8"); }
      catch { return fs.readFile(defaultFile(name), "utf8"); }
    },
    async set(name: PromptName, text: string): Promise<void> {
      await fs.mkdir(activeDir, { recursive: true });
      await fs.writeFile(activeFile(name), text, "utf8");
    },
    async reset(name: PromptName): Promise<void> {
      try { await fs.unlink(activeFile(name)); } catch { /* already default */ }
    },
  };
}

export const promptStore = makePromptStore(
  path.join(process.cwd(), "data", "prompts"),
  path.join(process.cwd(), "prompts", "defaults"),
);
```

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- prompts/store`
Expected: PASS (4 tests).
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add prompts/defaults src/lib/prompts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: default prompt templates and prompt file store

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 프롬프트 빌더 async 전환 (templates + render helpers)

**Files:**
- Modify: `src/lib/llm/prompts.ts`
- Modify: `src/lib/llm/prompts.test.ts`

**중요:** 이 태스크는 기존 동기 `selectPrompt`/`answerPrompt`를 제거하고 `buildSelectPrompt`/`buildAnswerPrompt`(async) + 순수 렌더 헬퍼로 대체한다. 어댑터(Task 6)가 새 함수를 사용하도록 함께 바뀌어야 빌드가 통과하므로, 이 태스크 종료 시점에는 `npx tsc --noEmit`가 어댑터 미수정으로 인해 실패할 수 있다 — Task 6까지 합쳐 그린이 되면 된다. 단, **이 태스크의 단위 테스트(prompts.test.ts)는 통과해야 한다.** (tsc 전체 그린은 Task 6에서 확인.)

- [ ] **Step 1: 기존 테스트를 새 API로 교체 (실패 테스트)**

Replace `src/lib/llm/prompts.test.ts` entirely with the final version below. It mocks the prompt store module so the async builders read deterministic templates:
```ts
import { it, expect, vi } from "vitest";

vi.mock("@/lib/prompts/store", () => ({
  promptStore: {
    get: vi.fn(async (name: string) =>
      name === "select"
        ? "SELECT Q={{question}} C={{candidates}}"
        : "ANSWER Q={{question}} A={{articles}}",
    ),
  },
}));

import { renderCandidates, renderArticles, buildSelectPrompt, buildAnswerPrompt } from "./prompts";

it("renderCandidates lists id, title and tags per line", () => {
  const out = renderCandidates([{ id: "a1", title: "금리 인상", tags: ["경제", "금리"] }]);
  expect(out).toContain("id=a1");
  expect(out).toContain('제목="금리 인상"');
  expect(out).toContain("태그=[경제, 금리]");
});

it("renderArticles includes content and image captions", () => {
  const out = renderArticles([
    { id: "a1", title: "T", content: "본문", images: [{ filename: "x.jpg", caption: "캡션" }], publishedDate: "2026-06-01" },
  ]);
  expect(out).toContain("본문");
  expect(out).toContain("캡션");
  expect(out).toContain("x.jpg");
});

it("buildSelectPrompt substitutes question and rendered candidates", async () => {
  const p = await buildSelectPrompt("금리?", [{ id: "a1", title: "금리 인상", tags: ["경제"] }]);
  expect(p).toContain("Q=금리?");
  expect(p).toContain("id=a1");
});

it("buildAnswerPrompt substitutes question and rendered articles", async () => {
  const p = await buildAnswerPrompt("질문", [
    { id: "a1", title: "T", content: "본문", images: [], publishedDate: "2026-06-01" },
  ]);
  expect(p).toContain("Q=질문");
  expect(p).toContain("본문");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- llm/prompts`
Expected: FAIL (renderCandidates/buildSelectPrompt not exported).

- [ ] **Step 3: 빌더 + 헬퍼 구현**

Replace `src/lib/llm/prompts.ts`:
```ts
import type { ArticleCandidate, ArticleContext } from "./types";
import { promptStore } from "@/lib/prompts/store";

export function renderCandidates(candidates: ArticleCandidate[]): string {
  return candidates
    .map((c) => `- id=${c.id} | 제목="${c.title}" | 태그=[${c.tags.join(", ")}]`)
    .join("\n");
}

export function renderArticles(articles: ArticleContext[]): string {
  return articles
    .map((a) => {
      const imgs = a.images.map((i) => `  - 이미지 ${i.filename}: ${i.caption}`).join("\n");
      return `### ${a.title} (id=${a.id}, ${a.publishedDate})\n${a.content}\n이미지:\n${imgs}`;
    })
    .join("\n\n");
}

export async function buildSelectPrompt(question: string, candidates: ArticleCandidate[]): Promise<string> {
  const tpl = await promptStore.get("select");
  return tpl
    .replaceAll("{{question}}", question)
    .replaceAll("{{candidates}}", renderCandidates(candidates));
}

export async function buildAnswerPrompt(question: string, articles: ArticleContext[]): Promise<string> {
  const tpl = await promptStore.get("answer");
  return tpl
    .replaceAll("{{question}}", question)
    .replaceAll("{{articles}}", renderArticles(articles));
}
```

- [ ] **Step 4: 단위 테스트 통과 확인**

Run: `npm run test -- llm/prompts`
Expected: PASS (4 tests).
(전체 `npx tsc --noEmit`는 어댑터가 아직 옛 함수를 import하므로 실패할 수 있음 — Task 6에서 해결. 이 단계에서는 건너뛴다.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/prompts.ts src/lib/llm/prompts.test.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "refactor: file-backed async prompt builders with render helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: LlmProvider 인터페이스에 model 인자 추가

**Files:**
- Modify: `src/lib/llm/types.ts`

- [ ] **Step 1: 인터페이스 수정**

In `src/lib/llm/types.ts`, replace the `LlmProvider` interface with:
```ts
export interface LlmProvider {
  // 1단계: 질의 폴리싱 + 참고 기사 선택 (구조화 JSON)
  selectArticles(question: string, candidates: ArticleCandidate[], model: string): Promise<SelectResult>;
  // 2단계: 선택된 기사 전문으로 답변 생성 (마크다운 텍스트)
  answer(question: string, articles: ArticleContext[], model: string): Promise<string>;
}
```
(Leave `ProviderName`, `ArticleCandidate`, `SelectResult`, `ArticleContext` unchanged.)

- [ ] **Step 2: 타입체크 (실패 예상)**

Run: `npx tsc --noEmit`
Expected: FAIL — 어댑터 3종이 아직 옛 시그니처/옛 import를 사용. 다음 태스크에서 해결. (확인만 하고 진행.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/llm/types.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "refactor: add model param to LlmProvider interface

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 어댑터 3종 — model 인자 + async 빌더 사용

**Files:**
- Modify: `src/lib/llm/anthropic.ts`
- Modify: `src/lib/llm/openai.ts`
- Modify: `src/lib/llm/gemini.ts`

- [ ] **Step 1: Anthropic 어댑터 수정**

Replace `src/lib/llm/anthropic.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

function text(msg: Message): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, model) {
    const res = await client().messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: await buildSelectPrompt(question, candidates) }],
    });
    const raw = text(res).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, model) {
    const res = await client().messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    return text(res);
  },
};
```

- [ ] **Step 2: OpenAI 어댑터 수정**

Replace `src/lib/llm/openai.ts`:
```ts
import OpenAI from "openai";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, model) {
    const res = await client().chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: await buildSelectPrompt(question, candidates) }],
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, model) {
    const res = await client().chat.completions.create({
      model,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    return res.choices[0].message.content ?? "";
  },
};
```

- [ ] **Step 3: Gemini 어댑터 수정**

Replace `src/lib/llm/gemini.ts`:
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function model(modelId: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: modelId });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, modelId) {
    const res = await model(modelId).generateContent(
      (await buildSelectPrompt(question, candidates)) + "\n\nJSON만 출력하라.",
    );
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, modelId) {
    const res = await model(modelId).generateContent(await buildAnswerPrompt(question, articles));
    return res.response.text();
  },
};
```

- [ ] **Step 4: 타입체크 (orchestrator 미수정으로 여전히 실패 가능)**

Run: `npx tsc --noEmit`
Expected: 어댑터 자체는 OK지만 orchestrator가 아직 model 없이 호출하므로 FAIL일 수 있음 — Task 7에서 해결. (확인만.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/anthropic.ts src/lib/llm/openai.ts src/lib/llm/gemini.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "refactor: adapters use injected model and async prompt builders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: orchestrator에 model 전달

**Files:**
- Modify: `src/lib/chat/orchestrator.ts`
- Modify: `src/lib/chat/orchestrator.test.ts`

- [ ] **Step 1: 테스트를 새 시그니처로 갱신 (실패 테스트)**

Replace `src/lib/chat/orchestrator.test.ts`:
```ts
import { it, expect, vi } from "vitest";
import { runChat } from "./orchestrator";
import type { Article } from "../articles/types";
import type { LlmProvider } from "../llm/types";

const articles: Article[] = [
  { id: "a1", title: "금리 인상", content: "본문1", images: [], publishedDate: "2026-06-01", tags: ["경제"] },
  { id: "a2", title: "날씨", content: "본문2", images: [], publishedDate: "2026-06-02", tags: ["생활"] },
];
const store = { list: vi.fn(async () => articles) };

it("passes model through to selectArticles and answer; returns answer + sources", async () => {
  const provider: LlmProvider = {
    selectArticles: vi.fn(async () => ({ polishedQuery: "기준금리 인상", selectedIds: ["a1"] })),
    answer: vi.fn(async () => "금리가 올랐습니다."),
  };
  const res = await runChat({ question: "금리 어때?", provider, model: "test-model", store: store as never });
  expect(res.polishedQuery).toBe("기준금리 인상");
  expect(res.sources.map((s) => s.id)).toEqual(["a1"]);
  // model is the 3rd arg of both calls
  expect((provider.selectArticles as never as { mock: { calls: unknown[][] } }).mock.calls[0][2]).toBe("test-model");
  expect((provider.answer as never as { mock: { calls: unknown[][] } }).mock.calls[0][2]).toBe("test-model");
  // answer receives only the selected article(s) as 2nd arg
  expect((provider.answer as never as { mock: { calls: unknown[][] } }).mock.calls[0][1]).toHaveLength(1);
});

it("returns empty sources and fallback when nothing selected, without calling answer", async () => {
  const provider: LlmProvider = {
    selectArticles: vi.fn(async () => ({ polishedQuery: "x", selectedIds: [] })),
    answer: vi.fn(),
  };
  const res = await runChat({ question: "??", provider, model: "test-model", store: store as never });
  expect(res.sources).toEqual([]);
  expect(res.answer).toMatch(/관련 기사/);
  expect(provider.answer).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- orchestrator`
Expected: FAIL (runChat 시그니처에 model 없음 / 호출에 model 미전달).

- [ ] **Step 3: orchestrator 수정**

Replace `src/lib/chat/orchestrator.ts`:
```ts
import type { Article } from "../articles/types";
import type { LlmProvider, ArticleContext } from "../llm/types";

export interface ChatSource {
  id: string;
  title: string;
  publishedDate: string;
  images: { filename: string; caption: string }[];
}
export interface ChatResult {
  polishedQuery: string;
  answer: string;
  sources: ChatSource[];
}
interface Deps {
  question: string;
  provider: LlmProvider;
  model: string;
  store: { list(): Promise<Article[]> };
}

export async function runChat({ question, provider, model, store }: Deps): Promise<ChatResult> {
  const all = await store.list();
  const candidates = all.map((a) => ({ id: a.id, title: a.title, tags: a.tags }));
  const { polishedQuery, selectedIds } = await provider.selectArticles(question, candidates, model);

  const selected = all.filter((a) => selectedIds.includes(a.id));
  if (selected.length === 0) {
    return { polishedQuery, answer: "관련 기사를 찾지 못했습니다.", sources: [] };
  }
  const context: ArticleContext[] = selected.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    images: a.images,
    publishedDate: a.publishedDate,
  }));
  const answer = await provider.answer(question, context, model);
  const sources: ChatSource[] = selected.map((a) => ({
    id: a.id,
    title: a.title,
    publishedDate: a.publishedDate,
    images: a.images,
  }));
  return { polishedQuery, answer, sources };
}
```

- [ ] **Step 4: 통과 확인 + 전체 타입체크**

Run: `npm run test -- orchestrator`
Expected: PASS (2 tests).
Run: `npx tsc --noEmit`
Expected: 이제 lib 레이어는 clean (chat route가 아직 옛 호출이면 실패 — Task 8에서 해결). 어댑터/빌더/오케스트레이터까지의 라이브러리 레이어 타입 정합 확인.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/orchestrator.ts src/lib/chat/orchestrator.test.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "refactor: thread model through chat orchestrator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: chat API 라우트 — settings 사용

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: 라우트 수정**

Replace `src/app/api/chat/route.ts`:
```ts
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
```

- [ ] **Step 2: 전체 검증**

Run: `npx tsc --noEmit`
Expected: clean (전체 라이브러리+chat route 정합).
Run: `npm run test`
Expected: 모든 테스트 그린 (기존 + models/settings/prompts store/prompts builder/orchestrator).
Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: chat route resolves provider and model from settings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: settings / prompts API 라우트

**Files:**
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/prompts/route.ts`
- Create: `src/app/api/prompts/reset/route.ts`

- [ ] **Step 1: settings 라우트**

Create `src/app/api/settings/route.ts`:
```ts
import { NextResponse } from "next/server";
import { settingsStore } from "@/lib/config/settings";
import { MODEL_CATALOG } from "@/lib/llm/models";
import type { Settings } from "@/lib/config/settings";

export async function GET() {
  const settings = await settingsStore.get();
  return NextResponse.json({ ...settings, catalog: MODEL_CATALOG });
}

export async function PUT(req: Request) {
  const patch = (await req.json()) as Partial<Settings>;
  const saved = await settingsStore.save(patch);
  return NextResponse.json(saved);
}
```

- [ ] **Step 2: prompts 라우트 (GET/PUT)**

Create `src/app/api/prompts/route.ts`:
```ts
import { NextResponse } from "next/server";
import { promptStore, type PromptName } from "@/lib/prompts/store";

export async function GET() {
  const names: PromptName[] = ["select", "answer"];
  const entries = await Promise.all(
    names.map(async (n) => [n, { text: await promptStore.get(n), overridden: await promptStore.isOverridden(n) }] as const),
  );
  return NextResponse.json(Object.fromEntries(entries));
}

export async function PUT(req: Request) {
  const { name, text } = (await req.json()) as { name: PromptName; text: string };
  if (name !== "select" && name !== "answer") {
    return NextResponse.json({ error: "invalid prompt name" }, { status: 400 });
  }
  await promptStore.set(name, text);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: prompts reset 라우트**

Create `src/app/api/prompts/reset/route.ts`:
```ts
import { NextResponse } from "next/server";
import { promptStore, type PromptName } from "@/lib/prompts/store";

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name: PromptName };
  if (name !== "select" && name !== "answer") {
    return NextResponse.json({ error: "invalid prompt name" }, { status: 400 });
  }
  await promptStore.reset(name);
  return NextResponse.json({ text: await promptStore.getDefault(name) });
}
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npm run build`
Expected: 성공 (`/api/settings`, `/api/prompts`, `/api/prompts/reset` 라우트 등장).

- [ ] **Step 5: 수동 스모크 (선택)**

dev 서버에서:
```bash
curl -s localhost:3000/api/settings
curl -s -X PUT localhost:3000/api/settings -H "content-type: application/json" -d '{"provider":"gemini"}'
curl -s localhost:3000/api/prompts
```
Expect: 기본 설정 JSON(catalog 포함) → provider gemini로 저장된 JSON → 프롬프트 텍스트 2종. 끝나면 `data/config/settings.json` 정리(테스트 흔적 커밋 금지) 또는 그대로 두되 commit 단계에서 제외.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings src/app/api/prompts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: settings and prompts API routes"
```
(주의: `data/config/settings.json` 등 런타임 산출물은 스테이징하지 말 것.)

---

## Task 10: settings UI 컴포넌트 + 페이지

**Files:**
- Create: `src/components/settings/ProviderModelPicker.tsx`
- Create: `src/components/settings/PromptEditor.tsx`
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: ProviderModelPicker**

Create `src/components/settings/ProviderModelPicker.tsx`:
```tsx
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";

const LABELS: Record<ProviderName, string> = { anthropic: "Anthropic", openai: "OpenAI", gemini: "Google" };

export function ProviderModelPicker({
  provider, models, catalog, onProvider, onModel,
}: {
  provider: ProviderName;
  models: Record<ProviderName, string>;
  catalog: Record<ProviderName, ModelOption[]>;
  onProvider: (p: ProviderName) => void;
  onModel: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
      <label>
        프로바이더{" "}
        <select value={provider} onChange={(e) => onProvider(e.target.value as ProviderName)}>
          {(Object.keys(LABELS) as ProviderName[]).map((p) => (
            <option key={p} value={p}>{LABELS[p]}</option>
          ))}
        </select>
      </label>
      <label>
        모델{" "}
        <select value={models[provider]} onChange={(e) => onModel(e.target.value)}>
          {catalog[provider].map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: PromptEditor**

Create `src/components/settings/PromptEditor.tsx`:
```tsx
export function PromptEditor({
  title, value, overridden, onChange, onSave, onReset,
}: {
  title: string;
  value: string;
  overridden: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title}</strong>
        <span style={{ fontSize: 12, color: overridden ? "#b45309" : "#888" }}>
          {overridden ? "사용자 편집됨" : "기본값"}
        </span>
      </div>
      <textarea value={value} rows={10} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave}>저장</button>
        <button onClick={onReset}>기본값으로 초기화</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: settings 페이지**

Create `src/app/settings/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";
import { ProviderModelPicker } from "@/components/settings/ProviderModelPicker";
import { PromptEditor } from "@/components/settings/PromptEditor";

type Catalog = Record<ProviderName, ModelOption[]>;
type PromptState = { text: string; overridden: boolean };

export default function SettingsPage() {
  const [provider, setProvider] = useState<ProviderName>("anthropic");
  const [models, setModels] = useState<Record<ProviderName, string>>({
    anthropic: "", openai: "", gemini: "",
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [prompts, setPrompts] = useState<{ select: PromptState; answer: PromptState } | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    (async () => {
      const s = await (await fetch("/api/settings")).json();
      setProvider(s.provider);
      setModels(s.models);
      setCatalog(s.catalog);
      const p = await (await fetch("/api/prompts")).json();
      setPrompts(p);
    })();
  }, []);

  async function saveSettings() {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, models }),
    });
    const s = await res.json();
    setProvider(s.provider); setModels(s.models);
    setSavedMsg("설정 저장됨"); setTimeout(() => setSavedMsg(""), 2000);
  }

  async function savePrompt(name: "select" | "answer") {
    if (!prompts) return;
    await fetch("/api/prompts", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, text: prompts[name].text }),
    });
    setPrompts({ ...prompts, [name]: { ...prompts[name], overridden: true } });
    setSavedMsg(`${name} 프롬프트 저장됨`); setTimeout(() => setSavedMsg(""), 2000);
  }

  async function resetPrompt(name: "select" | "answer") {
    if (!prompts) return;
    const res = await fetch("/api/prompts/reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const { text } = await res.json();
    setPrompts({ ...prompts, [name]: { text, overridden: false } });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16, display: "grid", gap: 24 }}>
      <h2>설정</h2>
      {savedMsg && <div style={{ color: "#16a34a" }}>{savedMsg}</div>}

      <section>
        <h3>LLM 프로바이더 / 모델</h3>
        {catalog && (
          <ProviderModelPicker
            provider={provider} models={models} catalog={catalog}
            onProvider={setProvider}
            onModel={(id) => setModels({ ...models, [provider]: id })}
          />
        )}
        <div style={{ marginTop: 8 }}><button onClick={saveSettings}>설정 저장</button></div>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <h3>프롬프트</h3>
        {prompts && (
          <>
            <PromptEditor title="검색/선택 프롬프트 (select)" value={prompts.select.text}
              overridden={prompts.select.overridden}
              onChange={(t) => setPrompts({ ...prompts, select: { ...prompts.select, text: t } })}
              onSave={() => savePrompt("select")} onReset={() => resetPrompt("select")} />
            <PromptEditor title="답변 프롬프트 (answer)" value={prompts.answer.text}
              overridden={prompts.answer.overridden}
              onChange={(t) => setPrompts({ ...prompts, answer: { ...prompts.answer, text: t } })}
              onSave={() => savePrompt("answer")} onReset={() => resetPrompt("answer")} />
          </>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npm run build`
Expected: 성공 (`/settings` 라우트 등장).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings src/app/settings
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: settings page with model picker and prompt editors

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: ChatWindow에서 프로바이더 드롭다운 제거 + 네비 추가

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Delete: `src/components/chat/ProviderSelector.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: ChatWindow 수정 (provider 제거)**

Replace `src/components/chat/ChatWindow.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { ChatResult } from "@/lib/chat/orchestrator";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { PromptCard } from "./PromptCard";

const DEMO_PROMPTS = [
  "최근 금리 인상이 가계에 미치는 영향은?",
  "이번 주 가장 중요한 경제 뉴스 요약해줘",
  "AI 관련 정책 동향이 궁금해",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as ChatResult & { error?: string };
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.error ? `오류: ${data.error}` : data.answer,
        polishedQuery: data.polishedQuery,
        sources: data.sources,
      }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h2>신문 에이전트</h2>
      {messages.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" }}>
          {DEMO_PROMPTS.map((p) => <PromptCard key={p} text={p} onPick={send} />)}
        </div>
      )}
      <MessageList messages={messages} />
      {loading && <div style={{ color: "#888" }}>답변 생성 중…</div>}
      <div style={{ marginTop: 12 }}><Composer onSend={send} disabled={loading} /></div>
    </div>
  );
}
```

- [ ] **Step 2: ProviderSelector 삭제**

```bash
git rm src/components/chat/ProviderSelector.tsx
```
(Windows에서 파일이 남아있으면 `Remove-Item src/components/chat/ProviderSelector.tsx` 후 `git add -A`.)

- [ ] **Step 3: layout에 네비 추가**

Open `src/app/layout.tsx`. It currently renders `<body ...>{children}</body>` (create-next-app default with font className). Insert a nav at the top of `<body>`, immediately before `{children}`:
```tsx
        <nav style={{ display: "flex", gap: 16, padding: "12px 16px", borderBottom: "1px solid #eee" }}>
          <a href="/">Chat</a>
          <a href="/admin">Admin</a>
          <a href="/settings">Settings</a>
        </nav>
        {children}
```
Keep the existing `<html>`, `<body>`, font variables, and metadata untouched — only add the `<nav>` element directly inside `<body>` before `{children}`.

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit`
Expected: clean (no remaining import of ProviderSelector).
Run: `npm run test`
Expected: 모든 테스트 그린.
Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: Commit**

```bash
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "feat: settings as single source; remove chat provider dropdown; add nav

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: 런타임 디렉토리 keep + 최종 점검

**Files:**
- Create: `data/config/.gitkeep`
- Create: `data/prompts/.gitkeep`

- [ ] **Step 1: 런타임 디렉토리 keep 파일**

Create empty `data/config/.gitkeep` and `data/prompts/.gitkeep`. If smoke tests left `data/config/settings.json` or files under `data/prompts/`, remove them so only `.gitkeep` is added:
```bash
# remove runtime artifacts if present (keep .gitkeep)
rm -f data/config/settings.json
rm -f data/prompts/select.md data/prompts/answer.md
```

- [ ] **Step 2: 전체 게이트**

Run: `npm run test`
Expected: 모든 테스트 PASS (articles store, llm index, models, settings, prompts store, prompts builder, orchestrator, SourceCard).
Run: `npx tsc --noEmit`
Expected: clean.
Run: `npm run build`
Expected: 성공. 라우트 목록에 `/`, `/admin`, `/settings`, `/api/settings`, `/api/prompts`, `/api/prompts/reset`, `/api/chat`, `/api/articles*`, `/api/images/*`, `/api/upload` 포함.

- [ ] **Step 3: 수동 E2E (키 있을 때)**

`.env.local`에 키 1개 설정 후 dev 서버:
- `/settings`에서 프로바이더/모델 변경 → 저장 → 새로고침 후 유지 확인.
- select/answer 프롬프트 편집 → 저장 → "사용자 편집됨" 표시 → 초기화 → "기본값" 복귀 확인.
- `/`에서 데모 카드 클릭 → 설정한 프로바이더/모델로 답변 생성, "다음의 검색어로…" 노출 확인.
- 상단 네비로 Chat/Admin/Settings 이동 확인.
(키 없으면 빌드/테스트 게이트까지만.)

- [ ] **Step 4: Commit**

```bash
git add data/config/.gitkeep data/prompts/.gitkeep
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "chore: keep runtime config/prompts directories"
```

---

## 자체 점검 결과 (작성자 기록)

- **Spec 커버리지:** 모델 카탈로그/기본값(Task 1) · settings 스토어(Task 2) · 기본 템플릿+프롬프트 스토어(Task 3) · async 빌더(Task 4) · LlmProvider model 인자(Task 5) · 어댑터(Task 6) · orchestrator(Task 7) · chat route settings 사용(Task 8) · settings/prompts API(Task 9) · settings UI(Task 10) · 드롭다운 제거+네비(Task 11) · 런타임 디렉토리+최종 점검(Task 12). spec 모든 절 매핑됨.
- **Placeholder:** 없음(모든 코드 스텝에 실제 코드 포함, Task 4 테스트는 Step 1에서 최종본 제공).
- **타입 일관성:** `Settings`/`ModelOption`/`PromptName`/`ChatResult`/`LlmProvider`(model 3번째 인자)/`MODEL_CATALOG` 정의(Task 1–7)와 사용처(Task 8–11) 시그니처 일치 확인. 어댑터/오케스트레이터/라우트가 모두 `model: string`을 일관되게 전달.
- **빌드 정합 순서:** Task 4–7은 중간 단계에서 tsc 전체가 일시적으로 실패할 수 있음을 명시(인터페이스 변경 도중). Task 8 종료 시 전체 tsc/test/build 그린이 되도록 순서 설계.
