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
