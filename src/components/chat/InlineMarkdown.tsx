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
            <figure key={i} style={{ margin: "8px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={caption} style={{ maxWidth: "100%", borderRadius: 6 }} />
              {caption && <figcaption style={{ fontSize: 12, color: "#888" }}>{caption}</figcaption>}
            </figure>
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</span>;
      })}
    </div>
  );
}
