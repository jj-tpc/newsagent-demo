import type { Article } from "@/lib/articles/types";

export function ArticleTable({ articles, onEdit, onDelete }: {
  articles: Article[]; onEdit: (a: Article) => void; onDelete: (id: string) => void;
}) {
  if (articles.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-xl) var(--space-md)",
          textAlign: "center",
          color: "var(--text-muted)",
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        등록된 기사가 없습니다.
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--text-sm)",
        }}
      >
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th scope="col" style={thStyle}>제목</th>
            <th scope="col" style={{ ...thStyle, whiteSpace: "nowrap" }}>발행일</th>
            <th scope="col" style={thStyle}>태그</th>
            <th scope="col" style={{ ...thStyle, textAlign: "right" }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{a.title}</td>
              <td style={{ ...tdStyle, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.publishedDate}</td>
              <td style={{ ...tdStyle, color: "var(--text-muted)" }}>{a.tags.join(", ")}</td>
              <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                <div style={{ display: "inline-flex", gap: "var(--space-2xs)" }}>
                  <button
                    type="button"
                    className="btn btn--sm"
                    aria-label={`${a.title} 편집`}
                    onClick={() => onEdit(a)}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    aria-label={`${a.title} 삭제`}
                    onClick={() => onDelete(a.id)}
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--space-sm) var(--space-md)",
  fontWeight: 700,
  color: "var(--text-strong)",
};
const tdStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
};
