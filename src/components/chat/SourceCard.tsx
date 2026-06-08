import type { ChatSource } from "@/lib/chat/orchestrator";

export function SourceCard({ source }: { source: ChatSource }) {
  const thumb = source.images[0];
  const external = Boolean(source.sourceUrl);
  // sourceUrl 있으면 원문 새 탭, 없으면 (수동 추가된 시드) /admin 페이지로
  const href = source.sourceUrl ?? `/admin?id=${source.id}`;
  return (
    <a
      className="paper-card"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={
        external
          ? `${source.title} — 원문 새 탭으로 열기`
          : `${source.title} — 관리 페이지로 이동`
      }
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
        style={{
          display: "flex",
          gap: "var(--space-xs)",
          alignItems: "baseline",
          marginTop: "var(--space-2xs)",
        }}
      >
        <span className="eyebrow numeric">{source.publishedDate}</span>
        {external && (
          <span
            aria-hidden
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginLeft: "auto",
            }}
            title="새 탭으로 열림"
          >
            ↗
          </span>
        )}
      </div>
    </a>
  );
}
