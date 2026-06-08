import type { Article } from "@/lib/articles/types";

export function ArticleTable({ articles, onEdit, onDelete }: {
  articles: Article[]; onEdit: (a: Article) => void; onDelete: (id: string) => void;
}) {
  if (articles.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-2xl) var(--space-md)",
          display: "grid",
          gap: "var(--space-xs)",
          justifyItems: "center",
          textAlign: "center",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface-2)",
        }}
      >
        <span className="eyebrow">아직 기사 없음</span>
        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          color: "var(--text-strong)",
          margin: 0,
          maxWidth: "30ch",
          lineHeight: 1.4,
        }}>
          편집국이 비어 있습니다
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0, maxWidth: "42ch" }}>
          위의 <b className="emph">+ 새 기사</b>로 직접 추가하거나, 설정 페이지의
          뉴스 크롤링으로 키워드를 검색해 채울 수 있습니다.
        </p>
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
              <td style={{ ...tdStyle, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)" }}>{a.title}</td>
              <td className="numeric" style={{ ...tdStyle, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.publishedDate}</td>
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
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "var(--text-sm)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};
const tdStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-md)",
};
