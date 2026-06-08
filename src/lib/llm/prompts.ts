import type { ArticleCandidate, ArticleContext } from "./types";
import { promptStore } from "@/lib/prompts/store";

const EXCERPT_CHARS = 200;

export function makeExcerpt(content: string, max: number = EXCERPT_CHARS): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).replace(/\s\S*$/, "") + "…";
}

export function renderCandidates(candidates: ArticleCandidate[]): string {
  return candidates
    .map((c) => {
      const tags = c.tags.join(", ");
      const excerpt = c.excerpt ? `\n  본문 일부: ${c.excerpt}` : "";
      return `- id=${c.id} | 제목="${c.title}" | 태그=[${tags}]${excerpt}`;
    })
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

export async function buildSelectPrompt(
  question: string,
  candidates: ArticleCandidate[],
  maxSources: number,
): Promise<string> {
  const tpl = await promptStore.get("select");
  const body = tpl
    .replaceAll("{{question}}", question)
    .replaceAll("{{candidates}}", renderCandidates(candidates));
  // 템플릿 뒤에 시스템 규칙으로 강제 — 사용자가 프롬프트를 편집해도 캡은 유지됨
  return `${body}

[필수 규칙]
- selectedIds는 가장 도움이 되는 기사 ${maxSources}개 이하로 골라라. 관련성이 낮은 기사는 제외하라.
- 후보 중 정말 관련 있는 기사가 없으면 selectedIds를 빈 배열로 두어라.`;
}

export async function buildAnswerPrompt(
  question: string,
  articles: ArticleContext[],
  maxImages: number,
): Promise<string> {
  const tpl = await promptStore.get("answer");
  const body = tpl
    .replaceAll("{{question}}", question)
    .replaceAll("{{articles}}", renderArticles(articles));
  const imageRule = maxImages > 0
    ? `- 답변 본문에 포함할 이미지는 최대 ${maxImages}장이다.
- 이미지를 넣을 때는 한 곳에 묶어서 연속된 줄로 배치하라. 단락 사이사이에 흩뿌리지 말 것:
  \`\`\`
  텍스트 단락…

  ![캡션1](파일명1)
  ![캡션2](파일명2)

  다음 텍스트 단락…
  \`\`\`
- 같은 사건의 사진이 여러 장이면 본질이 같은 한 장만 골라라.`
    : `- 답변 본문에 이미지를 포함하지 마라.`;
  return `${body}

[이미지 규칙]
${imageRule}`;
}
