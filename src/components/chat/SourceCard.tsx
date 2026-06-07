import type { ChatSource } from "@/lib/chat/orchestrator";

export function SourceCard({ source }: { source: ChatSource }) {
  const thumb = source.images[0];
  return (
    <a href={`/admin?id=${source.id}`} style={{ display: "block", border: "1px solid #ddd", borderRadius: 8, padding: 8, textDecoration: "none", color: "inherit", minWidth: 180 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumb && <img src={`/api/images/${thumb.filename}`} alt={thumb.caption} style={{ width: "100%", borderRadius: 4 }} />}
      <div style={{ fontWeight: 600, marginTop: 4 }}>{source.title}</div>
      <div style={{ fontSize: 12, color: "#888" }}>{source.publishedDate}</div>
    </a>
  );
}
