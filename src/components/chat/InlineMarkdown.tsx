import React from "react";

// ![caption](filename) → /api/images/filename 로 렌더, 그 외는 단락 텍스트
export function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);
  return (
    <div>
      {parts.map((p, i) => {
        const m = p.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (m) {
          const [, caption, file] = m;
          const src = file.startsWith("http") ? file : `/api/images/${file.split("/").pop()}`;
          return (
            <figure key={i} style={{ margin: "var(--space-sm) 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={caption}
                loading="lazy"
                style={{ maxWidth: "100%", borderRadius: "var(--radius-md)", display: "block" }}
              />
              {caption && (
                <figcaption
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    marginTop: "var(--space-2xs)",
                  }}
                >
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</span>;
      })}
    </div>
  );
}
