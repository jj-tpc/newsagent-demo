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
