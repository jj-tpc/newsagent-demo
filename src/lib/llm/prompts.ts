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
