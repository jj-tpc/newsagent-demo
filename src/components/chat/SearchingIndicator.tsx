export function SearchingIndicator({ query }: { query: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2xs)",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        marginBottom: "var(--space-xs)",
        paddingBottom: "var(--space-xs)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="6" cy="6" r="4.5" />
        <line x1="9.3" y1="9.3" x2="12.5" y2="12.5" />
      </svg>
      <span className="eyebrow" style={{ fontSize: "var(--text-xs)" }}>검색어</span>
      <span className="emph" style={{ color: "var(--text)", fontSize: "var(--text-sm)" }}>
        {query}
      </span>
    </div>
  );
}
