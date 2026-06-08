import type { ChatSource } from "@/lib/chat/orchestrator";

export function SourceCard({ source }: { source: ChatSource }) {
  const thumb = source.images[0];
  return (
    <a
      className="paper-card"
      href={`/admin?id=${source.id}`}
      style={{
        display: "block",
        padding: "var(--space-xs)",
        textDecoration: "none",
        width: 180,
      }}
    >
      {thumb ? (
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
      ) : (
        <div
          aria-hidden
          style={{
            width: "100%",
            aspectRatio: "16 / 10",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-sm)",
            display: "grid",
            placeItems: "center",
            color: "var(--text-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          기사
        </div>
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
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
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
