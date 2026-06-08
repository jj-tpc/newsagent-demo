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
