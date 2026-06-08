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
          fontSize: "var(--text-base)",
          letterSpacing: "-0.01em",
          marginTop: "var(--space-xs)",
          lineHeight: 1.35,
          color: "var(--text-strong)",
        }}
      >
        {source.title}
      </div>
      <div
        className="eyebrow numeric"
        style={{ marginTop: "var(--space-2xs)" }}
      >
        {source.publishedDate}
      </div>
    </a>
  );
}
