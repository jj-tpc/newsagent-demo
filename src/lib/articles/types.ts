export interface ArticleImage {
  filename: string;
  caption: string;
}
export interface Article {
  id: string;
  title: string;
  content: string;
  images: ArticleImage[];
  publishedDate: string; // YYYY-MM-DD
  tags: string[];
  /** 크롤러로 가져온 기사의 원본 URL. 중복 제거에 사용. */
  sourceUrl?: string;
}
