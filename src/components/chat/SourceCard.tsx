import type { ChatSource } from "@/lib/chat/orchestrator";

export function SourceCard({ source }: { source: ChatSource }) {
  const thumb = source.images[0];
  return (
    <a
      href={`/admin?id=${source.id}`}
      style={{
        display: "block",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-xs)",
        textDecoration: "none",
        color: "var(--text)",
        minWidth: 180,
        maxWidth: 220,
        background: "var(--surface)",
      }}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${thumb.filename}`}
          alt={thumb.caption}
          loading="lazy"
          style={{
            width: "100%",
            aspectRatio: "16 / 10",
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
            display: "block",
          }}
        />
      )}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          marginTop: "var(--space-xs)",
          lineHeight: 1.3,
        }}
      >
        {source.title}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginTop: "var(--space-2xs)",
        }}
      >
        {source.publishedDate}
      </div>
    </a>
  );
}
