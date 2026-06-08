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
