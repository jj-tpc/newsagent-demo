# 신문 에이전트 데모 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장된 신문기사(JSON)를 근거로 LLM이 참고 기사를 선제적으로 골라 출처·이미지와 함께 답하는 Next.js 챗봇 데모와 기사 관리 admin을 만든다.

**Architecture:** Next.js(App Router) 풀스택 단일 프로젝트. 데이터는 `data/articles/`의 JSON 파일 + `images/` 폴더로 보관. 챗봇은 2단계 LLM 흐름(① 질의 폴리싱+기사 선택 → ② 답변 생성)으로 동작하며, LLM은 GPT/Gemini/Anthropic 어댑터를 공통 인터페이스 뒤에 둔 멀티 프로바이더 구조다.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React, Vitest(+ @testing-library), Node fs(파일 저장), @anthropic-ai/sdk · openai · @google/generative-ai (LLM SDK).

---

## 파일 구조

```
newsagent_demo/
  data/
    articles/
      {id}.json
      images/{filename}
  src/
    lib/
      articles/
        store.ts          # JSON CRUD (목록/단건/생성/수정/삭제)
        types.ts          # Article, ArticleImage 타입
      llm/
        types.ts          # LlmProvider 인터페이스, 구조화 출력 타입
        index.ts          # provider 선택 팩토리
        anthropic.ts
        openai.ts
        gemini.ts
      chat/
        orchestrator.ts   # 2단계 흐름 (폴리싱+선택 → 답변)
    app/
      page.tsx            # 챗봇 메인
      admin/page.tsx      # 기사 관리
      api/
        chat/route.ts
        articles/route.ts
        articles/[id]/route.ts
        images/[filename]/route.ts
    components/
      chat/ ChatWindow, MessageList, MessageBubble, SourceCard,
            InlineImage, PromptCard, Composer, ProviderSelector, SearchingIndicator
      admin/ ArticleTable, ArticleEditor, ImageUploader, TagEditor
  data.config.ts          # DATA_DIR 등 경로 상수
```

각 파일 책임:
- `lib/articles/store.ts` — 파일시스템 JSON 읽기/쓰기만 담당. 비즈니스 로직 없음.
- `lib/llm/*` — 프로바이더별 호출 + 구조화 출력 파싱. 도메인 모름.
- `lib/chat/orchestrator.ts` — 기사 후보 구성 → LLM 호출 순서 → 응답 조립.
- `app/api/*` — HTTP 경계. 입력 검증 후 lib 호출.
- `components/*` — 표시. 데이터 패칭은 page에서 내려준 props/handler로.

---

## Task 0: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.local.example`, `data.config.ts`
- Create: `data/articles/.gitkeep`, `data/articles/images/.gitkeep`

- [ ] **Step 1: Next.js 프로젝트 초기화**

Run:
```bash
npx create-next-app@latest . --typescript --app --no-tailwind --eslint --src-dir --import-alias "@/*" --use-npm
```
Expected: `src/app/page.tsx` 등이 생성됨. (이미 파일이 있다는 프롬프트가 나오면 빈 디렉토리이므로 진행)

- [ ] **Step 2: 테스트/LLM 의존성 설치**

Run:
```bash
npm i @anthropic-ai/sdk openai @google/generative-ai
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```
Expected: 설치 성공.

- [ ] **Step 3: vitest 설정 작성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```
Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: 데이터 경로 상수 + env 예시**

Create `data.config.ts`:
```ts
import path from "node:path";
export const DATA_DIR = path.join(process.cwd(), "data", "articles");
export const IMAGES_DIR = path.join(DATA_DIR, "images");
```
Create `.env.local.example`:
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```
Create empty `data/articles/.gitkeep` and `data/articles/images/.gitkeep`.

- [ ] **Step 5: 빌드/테스트가 도는지 확인**

Run: `npm run test`
Expected: "No test files found" 또는 0 tests — 에러 없이 종료.
Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js news agent demo"
```

---

## Task 1: 기사 타입 + 저장소(store)

**Files:**
- Create: `src/lib/articles/types.ts`
- Create: `src/lib/articles/store.ts`
- Test: `src/lib/articles/store.test.ts`

- [ ] **Step 1: 타입 정의**

Create `src/lib/articles/types.ts`:
```ts
export interface ArticleImage {
  filename: string;
  caption: string;
}
export interface Article {
  id: string;
  title: string;
  content: string;
  images: ArticleImage[];
  publishedDate: string; // YYYY-MM-DD
  tags: string[];
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `src/lib/articles/store.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeStore } from "./store";

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

it("creates and reads an article", async () => {
  const store = makeStore(dir);
  await store.create({
    id: "a1", title: "T", content: "C", images: [],
    publishedDate: "2026-06-01", tags: ["x", "y"],
  });
  const got = await store.get("a1");
  expect(got?.title).toBe("T");
  const all = await store.list();
  expect(all.map((a) => a.id)).toEqual(["a1"]);
});

it("updates and deletes an article", async () => {
  const store = makeStore(dir);
  await store.create({ id: "a1", title: "T", content: "C", images: [], publishedDate: "2026-06-01", tags: [] });
  await store.update("a1", { title: "T2" });
  expect((await store.get("a1"))?.title).toBe("T2");
  await store.remove("a1");
  expect(await store.get("a1")).toBeNull();
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -- store`
Expected: FAIL ("makeStore" not exported).

- [ ] **Step 4: store 구현**

Create `src/lib/articles/store.ts`:
```ts
import fs from "node:fs/promises";
import path from "node:path";
import type { Article } from "./types";

export function makeStore(dir: string) {
  const file = (id: string) => path.join(dir, `${id}.json`);
  return {
    async list(): Promise<Article[]> {
      await fs.mkdir(dir, { recursive: true });
      const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
      const out = await Promise.all(
        names.map(async (n) => JSON.parse(await fs.readFile(path.join(dir, n), "utf8")) as Article),
      );
      return out.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
    },
    async get(id: string): Promise<Article | null> {
      try { return JSON.parse(await fs.readFile(file(id), "utf8")) as Article; }
      catch { return null; }
    },
    async create(a: Article): Promise<Article> {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(a.id), JSON.stringify(a, null, 2), "utf8");
      return a;
    },
    async update(id: string, patch: Partial<Article>): Promise<Article | null> {
      const cur = await this.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, id };
      await fs.writeFile(file(id), JSON.stringify(next, null, 2), "utf8");
      return next;
    },
    async remove(id: string): Promise<void> {
      try { await fs.unlink(file(id)); } catch { /* already gone */ }
    },
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -- store`
Expected: PASS (2 tests).

- [ ] **Step 6: 기본 store 인스턴스 export**

Append to `src/lib/articles/store.ts`:
```ts
import { DATA_DIR } from "../../../data.config";
export const articleStore = makeStore(DATA_DIR);
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/articles data.config.ts && git commit -m "feat: filesystem article store with tests"
```

---

## Task 2: LLM 프로바이더 인터페이스 + 팩토리

**Files:**
- Create: `src/lib/llm/types.ts`
- Create: `src/lib/llm/index.ts`
- Test: `src/lib/llm/index.test.ts`

- [ ] **Step 1: 타입/인터페이스 정의**

Create `src/lib/llm/types.ts`:
```ts
export type ProviderName = "anthropic" | "openai" | "gemini";

export interface ArticleCandidate {
  id: string;
  title: string;
  tags: string[];
}
export interface SelectResult {
  polishedQuery: string;
  selectedIds: string[];
}
export interface ArticleContext {
  id: string;
  title: string;
  content: string;
  images: { filename: string; caption: string }[];
  publishedDate: string;
}
export interface LlmProvider {
  // 1단계: 질의 폴리싱 + 참고 기사 선택 (구조화 JSON)
  selectArticles(question: string, candidates: ArticleCandidate[]): Promise<SelectResult>;
  // 2단계: 선택된 기사 전문으로 답변 생성 (마크다운 텍스트)
  answer(question: string, articles: ArticleContext[]): Promise<string>;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `src/lib/llm/index.test.ts`:
```ts
import { it, expect } from "vitest";
import { getProvider } from "./index";

it("throws on unknown provider", () => {
  // @ts-expect-error invalid name
  expect(() => getProvider("nope")).toThrow();
});
it("returns a provider object with required methods", () => {
  const p = getProvider("anthropic");
  expect(typeof p.selectArticles).toBe("function");
  expect(typeof p.answer).toBe("function");
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -- llm/index`
Expected: FAIL ("getProvider" not found).

- [ ] **Step 4: 팩토리 구현 (어댑터는 다음 태스크에서 채움 — 지금은 스텁 import)**

Create stub adapters so the factory compiles. Create `src/lib/llm/anthropic.ts`, `openai.ts`, `gemini.ts` each:
```ts
import type { LlmProvider } from "./types";
export const provider: LlmProvider = {
  async selectArticles() { throw new Error("not implemented"); },
  async answer() { throw new Error("not implemented"); },
};
```
Create `src/lib/llm/index.ts`:
```ts
import type { LlmProvider, ProviderName } from "./types";
import { provider as anthropic } from "./anthropic";
import { provider as openai } from "./openai";
import { provider as gemini } from "./gemini";

const registry: Record<ProviderName, LlmProvider> = { anthropic, openai, gemini };

export function getProvider(name: ProviderName): LlmProvider {
  const p = registry[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -- llm/index`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm && git commit -m "feat: llm provider interface and factory"
```

---

## Task 3: Anthropic 어댑터 (구조화 출력)

**Files:**
- Modify: `src/lib/llm/anthropic.ts`
- Create: `src/lib/llm/prompts.ts`
- Test: `src/lib/llm/prompts.test.ts`

- [ ] **Step 1: 프롬프트 빌더 실패 테스트**

Create `src/lib/llm/prompts.test.ts`:
```ts
import { it, expect } from "vitest";
import { selectPrompt, answerPrompt } from "./prompts";

it("select prompt lists candidate titles and tags", () => {
  const p = selectPrompt("질문", [{ id: "a1", title: "금리 인상", tags: ["경제"] }]);
  expect(p).toContain("a1");
  expect(p).toContain("금리 인상");
  expect(p).toContain("경제");
  expect(p).toContain("polishedQuery");
});
it("answer prompt includes article content and image captions", () => {
  const p = answerPrompt("질문", [{ id: "a1", title: "T", content: "본문", images: [{ filename: "x.jpg", caption: "캡션" }], publishedDate: "2026-06-01" }]);
  expect(p).toContain("본문");
  expect(p).toContain("캡션");
  expect(p).toContain("x.jpg");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- prompts`
Expected: FAIL (module not found).

- [ ] **Step 3: 프롬프트 빌더 구현**

Create `src/lib/llm/prompts.ts`:
```ts
import type { ArticleCandidate, ArticleContext } from "./types";

export function selectPrompt(question: string, candidates: ArticleCandidate[]): string {
  const list = candidates
    .map((c) => `- id=${c.id} | 제목="${c.title}" | 태그=[${c.tags.join(", ")}]`)
    .join("\n");
  return [
    "다음은 사용자 질문과, 보유한 신문기사 후보(제목·태그)다.",
    "질문을 검색에 적합하게 한 문장으로 다듬고(polishedQuery),",
    "답변에 참고할 기사 id 목록(selectedIds)을 고르라.",
    "반드시 JSON만 출력: {\"polishedQuery\": string, \"selectedIds\": string[]}",
    "",
    `질문: ${question}`,
    "후보 기사:",
    list,
  ].join("\n");
}

export function answerPrompt(question: string, articles: ArticleContext[]): string {
  const blocks = articles
    .map((a) => {
      const imgs = a.images.map((i) => `  - 이미지 ${i.filename}: ${i.caption}`).join("\n");
      return `### ${a.title} (id=${a.id}, ${a.publishedDate})\n${a.content}\n이미지:\n${imgs}`;
    })
    .join("\n\n");
  return [
    "아래 신문기사들만 근거로 사용자 질문에 한국어로 답하라.",
    "본문에 관련 이미지를 넣고 싶으면 `![캡션](파일명)` 형식으로 표기하라.",
    "근거가 없으면 모른다고 답하라.",
    "",
    `질문: ${question}`,
    "참고 기사:",
    blocks,
  ].join("\n");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- prompts`
Expected: PASS (2 tests).

- [ ] **Step 5: Anthropic 어댑터 구현**

Replace `src/lib/llm/anthropic.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "claude-opus-4-8";
function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}
function text(msg: { content: { type: string; text?: string }[] }): string {
  return msg.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await client().messages.create({
      model: MODEL, max_tokens: 1024,
      messages: [{ role: "user", content: selectPrompt(question, candidates) }],
    });
    const raw = text(res).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return { polishedQuery: String(parsed.polishedQuery ?? question), selectedIds: parsed.selectedIds ?? [] };
  },
  async answer(question, articles) {
    const res = await client().messages.create({
      model: MODEL, max_tokens: 2048,
      messages: [{ role: "user", content: answerPrompt(question, articles) }],
    });
    return text(res);
  },
};
```

- [ ] **Step 6: 타입체크/빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add src/lib/llm && git commit -m "feat: anthropic adapter and prompt builders"
```

---

## Task 4: OpenAI / Gemini 어댑터

**Files:**
- Modify: `src/lib/llm/openai.ts`, `src/lib/llm/gemini.ts`

- [ ] **Step 1: OpenAI 어댑터 구현**

Replace `src/lib/llm/openai.ts`:
```ts
import OpenAI from "openai";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "gpt-4o";
function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await client().chat.completions.create({
      model: MODEL, response_format: { type: "json_object" },
      messages: [{ role: "user", content: selectPrompt(question, candidates) }],
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    return { polishedQuery: String(parsed.polishedQuery ?? question), selectedIds: parsed.selectedIds ?? [] };
  },
  async answer(question, articles) {
    const res = await client().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: answerPrompt(question, articles) }],
    });
    return res.choices[0].message.content ?? "";
  },
};
```

- [ ] **Step 2: Gemini 어댑터 구현**

Replace `src/lib/llm/gemini.ts`:
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "gemini-1.5-pro";
function model() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await model().generateContent(
      selectPrompt(question, candidates) + "\n\nJSON만 출력하라.",
    );
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return { polishedQuery: String(parsed.polishedQuery ?? question), selectedIds: parsed.selectedIds ?? [] };
  },
  async answer(question, articles) {
    const res = await model().generateContent(answerPrompt(question, articles));
    return res.response.text();
  },
};
```

- [ ] **Step 3: 타입체크 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/lib/llm && git commit -m "feat: openai and gemini adapters"
```

---

## Task 5: 챗 오케스트레이터 (2단계 흐름)

**Files:**
- Create: `src/lib/chat/orchestrator.ts`
- Test: `src/lib/chat/orchestrator.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (가짜 provider/store 주입)**

Create `src/lib/chat/orchestrator.test.ts`:
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
const provider: LlmProvider = {
  selectArticles: vi.fn(async () => ({ polishedQuery: "기준금리 인상", selectedIds: ["a1"] })),
  answer: vi.fn(async () => "금리가 올랐습니다."),
};

it("polishes query, selects articles, returns answer + sources", async () => {
  const res = await runChat({ question: "금리 어때?", provider, store: store as never });
  expect(res.polishedQuery).toBe("기준금리 인상");
  expect(res.answer).toContain("금리");
  expect(res.sources.map((s) => s.id)).toEqual(["a1"]);
  // answer는 선택된 기사 전문만 받는다
  expect((provider.answer as never as { mock: { calls: unknown[][] } }).mock.calls[0][1]).toHaveLength(1);
});

it("returns empty sources and a fallback message when nothing selected", async () => {
  const p: LlmProvider = { selectArticles: vi.fn(async () => ({ polishedQuery: "x", selectedIds: [] })), answer: vi.fn() };
  const res = await runChat({ question: "??", provider: p, store: store as never });
  expect(res.sources).toEqual([]);
  expect(res.answer).toMatch(/관련 기사/);
  expect(p.answer).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- orchestrator`
Expected: FAIL ("runChat" not found).

- [ ] **Step 3: 오케스트레이터 구현**

Create `src/lib/chat/orchestrator.ts`:
```ts
import type { Article } from "../articles/types";
import type { LlmProvider, ArticleContext } from "../llm/types";

export interface ChatSource {
  id: string; title: string; publishedDate: string;
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
  store: { list(): Promise<Article[]> };
}

export async function runChat({ question, provider, store }: Deps): Promise<ChatResult> {
  const all = await store.list();
  const candidates = all.map((a) => ({ id: a.id, title: a.title, tags: a.tags }));
  const { polishedQuery, selectedIds } = await provider.selectArticles(question, candidates);

  const selected = all.filter((a) => selectedIds.includes(a.id));
  if (selected.length === 0) {
    return { polishedQuery, answer: "관련 기사를 찾지 못했습니다.", sources: [] };
  }
  const context: ArticleContext[] = selected.map((a) => ({
    id: a.id, title: a.title, content: a.content, images: a.images, publishedDate: a.publishedDate,
  }));
  const answer = await provider.answer(question, context);
  const sources: ChatSource[] = selected.map((a) => ({
    id: a.id, title: a.title, publishedDate: a.publishedDate, images: a.images,
  }));
  return { polishedQuery, answer, sources };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- orchestrator`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat && git commit -m "feat: 2-step chat orchestrator with tests"
```

---

## Task 6: API Routes — articles CRUD + images

**Files:**
- Create: `src/app/api/articles/route.ts` (GET list, POST create)
- Create: `src/app/api/articles/[id]/route.ts` (GET, PUT, DELETE)
- Create: `src/app/api/images/[filename]/route.ts` (GET)

- [ ] **Step 1: articles 컬렉션 라우트**

Create `src/app/api/articles/route.ts`:
```ts
import { NextResponse } from "next/server";
import { articleStore } from "@/lib/articles/store";
import type { Article } from "@/lib/articles/types";

export async function GET() {
  return NextResponse.json(await articleStore.list());
}
export async function POST(req: Request) {
  const body = (await req.json()) as Article;
  if (!body.id || !body.title) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }
  const created = await articleStore.create({
    images: [], tags: [], content: "", publishedDate: "", ...body,
  });
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: 단건 라우트**

Create `src/app/api/articles/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { articleStore } from "@/lib/articles/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const a = await articleStore.get(id);
  return a ? NextResponse.json(a) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json();
  const updated = await articleStore.update(id, patch);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await articleStore.remove(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: 이미지 서빙 라우트**

Create `src/app/api/images/[filename]/route.ts`:
```ts
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { IMAGES_DIR } from "../../../../../data.config";

type Ctx = { params: Promise<{ filename: string }> };
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
};

export async function GET(_: Request, { params }: Ctx) {
  const { filename } = await params;
  const safe = path.basename(filename); // 경로 탈출 방지
  try {
    const buf = await fs.readFile(path.join(IMAGES_DIR, safe));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
```

- [ ] **Step 4: 수동 검증 (dev 서버)**

Run: `npm run dev` (별도 터미널). 그 후:
```bash
curl -s localhost:3000/api/articles
curl -s -X POST localhost:3000/api/articles -H "content-type: application/json" -d '{"id":"t1","title":"테스트","content":"본문","publishedDate":"2026-06-08","tags":["경제"]}'
curl -s localhost:3000/api/articles/t1
```
Expected: 빈 배열 → 201 생성 → 단건 JSON. 마지막에 `curl -X DELETE localhost:3000/api/articles/t1`로 정리.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/articles src/app/api/images && git commit -m "feat: articles CRUD and image-serving API routes"
```

---

## Task 7: API Route — chat

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: chat 라우트 구현**

Create `src/app/api/chat/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getProvider } from "@/lib/llm";
import type { ProviderName } from "@/lib/llm/types";
import { articleStore } from "@/lib/articles/store";
import { runChat } from "@/lib/chat/orchestrator";

export async function POST(req: Request) {
  const { question, provider } = (await req.json()) as { question: string; provider: ProviderName };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  try {
    const result = await runChat({ question, provider: getProvider(provider), store: articleStore });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: 수동 검증**

`.env.local`에 사용 가능한 키 1개 설정 후, dev 서버에서:
```bash
curl -s -X POST localhost:3000/api/chat -H "content-type: application/json" -d '{"question":"최근 금리 소식 알려줘","provider":"anthropic"}'
```
Expected: `{ polishedQuery, answer, sources }` JSON. (기사 0건이면 sources 빈 배열 + 안내 메시지.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat && git commit -m "feat: chat API route wiring orchestrator and providers"
```

---

## Task 8: 챗봇 UI — 컴포넌트

**Files:**
- Create: `src/components/chat/types.ts`
- Create: `src/components/chat/SourceCard.tsx`, `InlineMarkdown.tsx`, `PromptCard.tsx`, `SearchingIndicator.tsx`, `ProviderSelector.tsx`, `Composer.tsx`, `MessageBubble.tsx`, `MessageList.tsx`, `ChatWindow.tsx`
- Test: `src/components/chat/SourceCard.test.tsx`

- [ ] **Step 1: UI 메시지 타입**

Create `src/components/chat/types.ts`:
```ts
import type { ChatSource } from "@/lib/chat/orchestrator";
export interface UiMessage {
  role: "user" | "assistant";
  text: string;
  polishedQuery?: string;
  sources?: ChatSource[];
}
```

- [ ] **Step 2: SourceCard 실패 테스트**

Create `src/components/chat/SourceCard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { SourceCard } from "./SourceCard";

it("renders title, date and thumbnail when image exists", () => {
  render(<SourceCard source={{ id: "a1", title: "금리 인상", publishedDate: "2026-06-01", images: [{ filename: "x.jpg", caption: "c" }] }} />);
  expect(screen.getByText("금리 인상")).toBeInTheDocument();
  expect(screen.getByText("2026-06-01")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAttribute("src", "/api/images/x.jpg");
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test -- SourceCard`
Expected: FAIL (module not found).

- [ ] **Step 4: SourceCard 구현**

Create `src/components/chat/SourceCard.tsx`:
```tsx
import type { ChatSource } from "@/lib/chat/orchestrator";

export function SourceCard({ source }: { source: ChatSource }) {
  const thumb = source.images[0];
  return (
    <a href={`/admin?id=${source.id}`} style={{ display: "block", border: "1px solid #ddd", borderRadius: 8, padding: 8, textDecoration: "none", color: "inherit", minWidth: 180 }}>
      {thumb && <img src={`/api/images/${thumb.filename}`} alt={thumb.caption} style={{ width: "100%", borderRadius: 4 }} />}
      <div style={{ fontWeight: 600, marginTop: 4 }}>{source.title}</div>
      <div style={{ fontSize: 12, color: "#888" }}>{source.publishedDate}</div>
    </a>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test -- SourceCard`
Expected: PASS.

- [ ] **Step 6: 답변 본문 인라인 이미지 렌더러**

Create `src/components/chat/InlineMarkdown.tsx` (LLM이 낸 `![캡션](파일명)`을 이미지로 치환, 나머지는 텍스트로):
```tsx
import React from "react";

// ![caption](filename) → /api/images/filename 로 렌더, 그 외는 단락 텍스트
export function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);
  return (
    <div>
      {parts.map((p, i) => {
        const m = p.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (m) {
          const [, caption, file] = m;
          const src = file.startsWith("http") ? file : `/api/images/${file.split("/").pop()}`;
          return (
            <figure key={i} style={{ margin: "8px 0" }}>
              <img src={src} alt={caption} style={{ maxWidth: "100%", borderRadius: 6 }} />
              {caption && <figcaption style={{ fontSize: 12, color: "#888" }}>{caption}</figcaption>}
            </figure>
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</span>;
      })}
    </div>
  );
}
```

- [ ] **Step 7: 보조 컴포넌트 구현**

Create `src/components/chat/SearchingIndicator.tsx`:
```tsx
export function SearchingIndicator({ query }: { query: string }) {
  return <div style={{ fontSize: 13, color: "#2563eb" }}>🔎 다음의 검색어로 찾아보고 있습니다: <b>{query}</b></div>;
}
```
Create `src/components/chat/PromptCard.tsx`:
```tsx
export function PromptCard({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  return (
    <button onClick={() => onPick(text)} style={{ textAlign: "left", border: "1px solid #ddd", borderRadius: 10, padding: 12, cursor: "pointer", background: "#fafafa" }}>
      {text}
    </button>
  );
}
```
Create `src/components/chat/ProviderSelector.tsx`:
```tsx
import type { ProviderName } from "@/lib/llm/types";
export function ProviderSelector({ value, onChange }: { value: ProviderName; onChange: (p: ProviderName) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ProviderName)}>
      <option value="anthropic">Anthropic</option>
      <option value="openai">GPT</option>
      <option value="gemini">Gemini</option>
    </select>
  );
}
```
Create `src/components/chat/Composer.tsx`:
```tsx
import { useState } from "react";
export function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(""); } };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={text} disabled={disabled} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()} placeholder="질문을 입력하세요"
        style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
      <button onClick={send} disabled={disabled}>전송</button>
    </div>
  );
}
```

- [ ] **Step 8: MessageBubble / MessageList**

Create `src/components/chat/MessageBubble.tsx`:
```tsx
import type { UiMessage } from "./types";
import { InlineMarkdown } from "./InlineMarkdown";
import { SearchingIndicator } from "./SearchingIndicator";
import { SourceCard } from "./SourceCard";

export function MessageBubble({ msg }: { msg: UiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", margin: "8px 0" }}>
      <div style={{ maxWidth: 640, background: isUser ? "#dbeafe" : "#f3f4f6", padding: 12, borderRadius: 12 }}>
        {msg.polishedQuery && <SearchingIndicator query={msg.polishedQuery} />}
        {isUser ? <span>{msg.text}</span> : <InlineMarkdown text={msg.text} />}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {msg.sources.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
```
Create `src/components/chat/MessageList.tsx`:
```tsx
import type { UiMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
export function MessageList({ messages }: { messages: UiMessage[] }) {
  return <div>{messages.map((m, i) => <MessageBubble key={i} msg={m} />)}</div>;
}
```

- [ ] **Step 9: ChatWindow (상태/패칭 컨테이너)**

Create `src/components/chat/ChatWindow.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ChatResult } from "@/lib/chat/orchestrator";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ProviderSelector } from "./ProviderSelector";
import { PromptCard } from "./PromptCard";

const DEMO_PROMPTS = [
  "최근 금리 인상이 가계에 미치는 영향은?",
  "이번 주 가장 중요한 경제 뉴스 요약해줘",
  "AI 관련 정책 동향이 궁금해",
];

export function ChatWindow() {
  const [provider, setProvider] = useState<ProviderName>("anthropic");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, provider }),
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>신문 에이전트</h2>
        <ProviderSelector value={provider} onChange={setProvider} />
      </div>
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

- [ ] **Step 10: 테스트/타입체크 확인**

Run: `npm run test`
Expected: 기존 + SourceCard 테스트 PASS.
Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 11: Commit**

```bash
git add src/components/chat && git commit -m "feat: chat UI components"
```

---

## Task 9: 챗봇 메인 페이지 연결

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 메인 페이지를 ChatWindow로 교체**

Replace `src/app/page.tsx`:
```tsx
import { ChatWindow } from "@/components/chat/ChatWindow";
export default function Home() {
  return <ChatWindow />;
}
```

- [ ] **Step 2: 수동 검증**

dev 서버에서 `localhost:3000` 접속 → 데모 프롬프트 카드 클릭 → 자동 전송 → "다음의 검색어로 찾아보고 있습니다" 노출 → 답변 + 출처 카드 확인. (기사 0건이면 안내 메시지.)

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: wire chat window into home page"
```

---

## Task 10: Admin 페이지 (목록/편집/추가/이미지 업로드)

**Files:**
- Create: `src/app/api/upload/route.ts` (이미지 업로드)
- Create: `src/components/admin/TagEditor.tsx`, `ArticleEditor.tsx`, `ArticleTable.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: 업로드 라우트**

Create `src/app/api/upload/route.ts`:
```ts
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { IMAGES_DIR } from "../../../../data.config";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const safe = path.basename(file.name);
  await fs.writeFile(path.join(IMAGES_DIR, safe), new Uint8Array(await file.arrayBuffer()));
  return NextResponse.json({ filename: safe });
}
```

- [ ] **Step 2: TagEditor**

Create `src/components/admin/TagEditor.tsx`:
```tsx
import { useState } from "react";
export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(""); };
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
        {tags.map((t) => (
          <span key={t} style={{ background: "#eee", borderRadius: 12, padding: "2px 8px" }}>
            {t} <button onClick={() => onChange(tags.filter((x) => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="태그 입력 후 Enter" />
    </div>
  );
}
```

- [ ] **Step 3: ArticleEditor**

Create `src/components/admin/ArticleEditor.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Article } from "@/lib/articles/types";
import { TagEditor } from "./TagEditor";

const empty: Article = { id: "", title: "", content: "", images: [], publishedDate: "", tags: [] };

export function ArticleEditor({ initial, onSaved }: { initial?: Article; onSaved: () => void }) {
  const [a, setA] = useState<Article>(initial ?? empty);
  const isEdit = Boolean(initial);

  async function uploadImage(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { filename } = await res.json();
    setA((s) => ({ ...s, images: [...s.images, { filename, caption: "" }] }));
  }
  async function save() {
    const url = isEdit ? `/api/articles/${a.id}` : "/api/articles";
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
    onSaved();
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
      <input placeholder="id" value={a.id} disabled={isEdit} onChange={(e) => setA({ ...a, id: e.target.value })} />
      <input placeholder="제목" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
      <input placeholder="발행일 YYYY-MM-DD" value={a.publishedDate} onChange={(e) => setA({ ...a, publishedDate: e.target.value })} />
      <textarea placeholder="본문" rows={8} value={a.content} onChange={(e) => setA({ ...a, content: e.target.value })} />
      <TagEditor tags={a.tags} onChange={(tags) => setA({ ...a, tags })} />
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
      {a.images.map((img, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <img src={`/api/images/${img.filename}`} alt="" style={{ width: 64 }} />
          <input placeholder="캡션" value={img.caption}
            onChange={(e) => setA({ ...a, images: a.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x) })} />
          <button onClick={() => setA({ ...a, images: a.images.filter((_, j) => j !== i) })}>삭제</button>
        </div>
      ))}
      <button onClick={save}>{isEdit ? "수정 저장" : "추가"}</button>
    </div>
  );
}
```

- [ ] **Step 4: ArticleTable**

Create `src/components/admin/ArticleTable.tsx`:
```tsx
import type { Article } from "@/lib/articles/types";
export function ArticleTable({ articles, onEdit, onDelete }: {
  articles: Article[]; onEdit: (a: Article) => void; onDelete: (id: string) => void;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th>제목</th><th>발행일</th><th>태그</th><th></th></tr></thead>
      <tbody>
        {articles.map((a) => (
          <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
            <td>{a.title}</td><td>{a.publishedDate}</td><td>{a.tags.join(", ")}</td>
            <td>
              <button onClick={() => onEdit(a)}>편집</button>
              <button onClick={() => onDelete(a.id)}>삭제</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Admin 페이지**

Create `src/app/admin/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { ArticleTable } from "@/components/admin/ArticleTable";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  async function load() { setArticles(await (await fetch("/api/articles")).json()); }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    load();
  }
  function afterSave() { setEditing(undefined); setCreating(false); load(); }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>기사 관리</h2>
      {!editing && !creating && (
        <>
          <button onClick={() => setCreating(true)}>+ 새 기사</button>
          <ArticleTable articles={articles} onEdit={setEditing} onDelete={remove} />
        </>
      )}
      {(editing || creating) && (
        <>
          <button onClick={() => { setEditing(undefined); setCreating(false); }}>← 목록</button>
          <ArticleEditor initial={editing} onSaved={afterSave} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 타입체크 + 수동 검증**

Run: `npx tsc --noEmit` → 에러 없음.
dev 서버 `localhost:3000/admin`: 새 기사 추가(제목·본문·태그·이미지+캡션·발행일) → 목록 표시 → 편집 → 삭제 동작 확인. 추가한 기사로 메인 챗봇이 답하는지 교차 확인.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin src/components/admin src/app/api/upload && git commit -m "feat: admin page with article CRUD and image upload"
```

---

## Task 11: 시드 데이터 + 최종 점검

**Files:**
- Create: `data/articles/2026-0001.json` (+ 샘플 이미지 1개)

- [ ] **Step 1: 샘플 기사 1~2건 작성**

Create `data/articles/2026-0001.json`:
```json
{
  "id": "2026-0001",
  "title": "한국은행, 기준금리 0.25%p 인상",
  "content": "한국은행 금융통화위원회는 기준금리를 0.25%포인트 인상했다. 물가 안정을 위한 조치로 ...",
  "images": [{ "filename": "rate.jpg", "caption": "금통위 회의 모습" }],
  "publishedDate": "2026-06-01",
  "tags": ["경제", "금리", "한국은행"]
}
```
`data/articles/images/rate.jpg`에 아무 샘플 이미지나 배치(없으면 이미지 없는 기사로 대체 가능).

- [ ] **Step 2: 전체 테스트**

Run: `npm run test`
Expected: 모든 테스트 PASS.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: E2E 데모 시나리오 수동 확인**

키 1개 설정 후 dev 서버: 메인에서 데모 카드 클릭 → 폴리싱 검색어 노출 → 시드 기사 근거 답변 + 출처 카드 + (이미지 있으면) 인라인 이미지. admin에서 기사 추가 후 다시 질문 시 반영 확인. 프로바이더 드롭다운 전환 동작 확인.

- [ ] **Step 5: Commit**

```bash
git add data && git commit -m "chore: seed sample article and final checks"
```

---

## 자체 점검 결과 (작성자 기록)

- **Spec 커버리지:** 기사 JSON 모델(Task 1) · 멀티 프로바이더 선택(Task 2–4, 8) · 2단계 태그/제목 기반 흐름+폴리싱 검색어 노출(Task 5, 8) · 출처 카드+인라인 이미지(Task 8) · 데모 프롬프트 카드(Task 8–9) · admin CRUD+태그 편집+이미지(Task 10) · 파일시스템 저장(Task 1, 6) 모두 매핑됨.
- **Placeholder:** 없음(모든 코드 스텝에 실제 코드 포함).
- **타입 일관성:** `Article`/`ChatSource`/`SelectResult`/`ArticleContext` 정의(Task 1·2·5)와 사용처(Task 6–10) 시그니처 일치 확인.
