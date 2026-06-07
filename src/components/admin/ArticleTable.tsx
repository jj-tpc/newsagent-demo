import type { Article } from "@/lib/articles/types";
export function ArticleTable({ articles, onEdit, onDelete }: {
  articles: Article[]; onEdit: (a: Article) => void; onDelete: (id: string) => void;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th>제목</th><th>발행일</th><th>태그</th><th></th></tr></thead>
      <tbody>
        {articles.map((a) => (
          <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
            <td>{a.title}</td><td>{a.publishedDate}</td><td>{a.tags.join(", ")}</td>
            <td>
              <button onClick={() => onEdit(a)}>편집</button>
              <button onClick={() => onDelete(a.id)}>삭제</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
