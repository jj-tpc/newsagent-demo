export function SearchingIndicator({ query }: { query: string }) {
  return (
    <div
      style={{
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        marginBottom: "var(--space-2xs)",
      }}
    >
      <span aria-hidden style={{ marginRight: "var(--space-2xs)" }}>🔎</span>
      검색어: <b style={{ color: "var(--text)" }}>{query}</b>
    </div>
  );
}
