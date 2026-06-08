import type { Article } from "../articles/types";
import type { LlmProvider, ArticleContext, ArticleCandidate } from "../llm/types";
import { makeExcerpt } from "../llm/prompts";

export interface ChatSource {
  id: string;
  title: string;
  publishedDate: string;
  images: { filename: string; caption: string }[];
  /** 크롤러로 가져온 기사의 원본 URL (있으면 새 탭으로 열어 본문 확인) */
  sourceUrl?: string;
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
  /** 답변에 참조할 기사 최대 개수 (LLM에 지시 + 결과 방어적 slice) */
  maxSources?: number;
  /** 답변 본문에 포함할 이미지 최대 수 (LLM에 지시) */
  maxImages?: number;
}

const FALLBACK_MAX_SOURCES = 3;
const FALLBACK_MAX_IMAGES = 3;

function toSource(a: Article): ChatSource {
  return {
    id: a.id,
    title: a.title,
    publishedDate: a.publishedDate,
    images: a.images,
    sourceUrl: a.sourceUrl,
  };
}

function toContext(a: Article): ArticleContext {
  return {
    id: a.id, title: a.title, content: a.content, images: a.images, publishedDate: a.publishedDate,
  };
}

function toCandidate(a: Article): ArticleCandidate {
  return { id: a.id, title: a.title, tags: a.tags, excerpt: makeExcerpt(a.content) };
}

export async function runChat({
  question, provider, model, store, maxSources, maxImages,
}: Deps): Promise<ChatResult> {
  const limitSources = maxSources ?? FALLBACK_MAX_SOURCES;
  const limitImages = maxImages ?? FALLBACK_MAX_IMAGES;
  const all = await store.list();
  const candidates = all.map(toCandidate);
  const { polishedQuery, selectedIds } = await provider.selectArticles(
    question, candidates, model, limitSources,
  );

  const cappedIds = selectedIds.slice(0, limitSources);
  const selected = all.filter((a) => cappedIds.includes(a.id));
  if (selected.length === 0) {
    return { polishedQuery, answer: "관련 기사를 찾지 못했습니다.", sources: [] };
  }
  const context = selected.map(toContext);
  const answer = await provider.answer(question, context, model, limitImages);
  return { polishedQuery, answer, sources: selected.map(toSource) };
}

/* ============================================================
   스트리밍 버전 — /api/chat에서 사용
   ============================================================ */

export type ChatStreamEvent =
  | { type: "meta"; polishedQuery: string; sources: ChatSource[] }
  | { type: "delta"; text: string };

export async function* runChatStream({
  question, provider, model, store, maxSources, maxImages,
}: Deps): AsyncGenerator<ChatStreamEvent> {
  const limitSources = maxSources ?? FALLBACK_MAX_SOURCES;
  const limitImages = maxImages ?? FALLBACK_MAX_IMAGES;
  const all = await store.list();
  const candidates = all.map(toCandidate);
  const { polishedQuery, selectedIds } = await provider.selectArticles(
    question, candidates, model, limitSources,
  );

  const cappedIds = selectedIds.slice(0, limitSources);
  const selected = all.filter((a) => cappedIds.includes(a.id));
  yield { type: "meta", polishedQuery, sources: selected.map(toSource) };

  if (selected.length === 0) {
    yield { type: "delta", text: "관련 기사를 찾지 못했습니다." };
    return;
  }

  const context = selected.map(toContext);
  if (provider.answerStream) {
    for await (const chunk of provider.answerStream(question, context, model, limitImages)) {
      yield { type: "delta", text: chunk };
    }
  } else {
    const text = await provider.answer(question, context, model, limitImages);
    yield { type: "delta", text };
  }
}
