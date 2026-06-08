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
  expect((provider.selectArticles as never as { mock: { calls: unknown[][] } }).mock.calls[0][2]).toBe("test-model");
  expect((provider.answer as never as { mock: { calls: unknown[][] } }).mock.calls[0][2]).toBe("test-model");
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
