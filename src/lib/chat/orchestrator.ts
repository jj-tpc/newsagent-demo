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

function toSource(a: Article): ChatSource {
  return { id: a.id, title: a.title, publishedDate: a.publishedDate, images: a.images };
}

function toContext(a: Article): ArticleContext {
  return {
    id: a.id, title: a.title, content: a.content, images: a.images, publishedDate: a.publishedDate,
  };
}

export async function runChat({ question, provider, model, store }: Deps): Promise<ChatResult> {
  const all = await store.list();
  const candidates = all.map((a) => ({ id: a.id, title: a.title, tags: a.tags }));
  const { polishedQuery, selectedIds } = await provider.selectArticles(question, candidates, model);

  const selected = all.filter((a) => selectedIds.includes(a.id));
  if (selected.length === 0) {
    return { polishedQuery, answer: "관련 기사를 찾지 못했습니다.", sources: [] };
  }
  const context = selected.map(toContext);
  const answer = await provider.answer(question, context, model);
  return { polishedQuery, answer, sources: selected.map(toSource) };
}

/* ============================================================
   스트리밍 버전 — /api/chat에서 사용
   - 'meta' 1회: polishedQuery + sources
   - 'delta' N회: 답변 텍스트 청크
   - 끝나면 generator return
   - selectArticles는 구조화 JSON이라 스트리밍 안 함 (먼저 끝나야 sources가 나옴)
   ============================================================ */

export type ChatStreamEvent =
  | { type: "meta"; polishedQuery: string; sources: ChatSource[] }
  | { type: "delta"; text: string };

export async function* runChatStream({
  question, provider, model, store,
}: Deps): AsyncGenerator<ChatStreamEvent> {
  const all = await store.list();
  const candidates = all.map((a) => ({ id: a.id, title: a.title, tags: a.tags }));
  const { polishedQuery, selectedIds } = await provider.selectArticles(question, candidates, model);

  const selected = all.filter((a) => selectedIds.includes(a.id));
  yield { type: "meta", polishedQuery, sources: selected.map(toSource) };

  if (selected.length === 0) {
    yield { type: "delta", text: "관련 기사를 찾지 못했습니다." };
    return;
  }

  const context = selected.map(toContext);
  if (provider.answerStream) {
    for await (const chunk of provider.answerStream(question, context, model)) {
      yield { type: "delta", text: chunk };
    }
  } else {
    // 폴백: 전체 답변을 단일 delta로
    const text = await provider.answer(question, context, model);
    yield { type: "delta", text };
  }
}
