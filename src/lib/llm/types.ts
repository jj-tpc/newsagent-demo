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
  selectArticles(question: string, candidates: ArticleCandidate[], model: string): Promise<SelectResult>;
  // 2단계: 선택된 기사 전문으로 답변 생성 (마크다운 텍스트)
  answer(question: string, articles: ArticleContext[], model: string): Promise<string>;
}
