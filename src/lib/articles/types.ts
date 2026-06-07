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
}
