import { useState } from "react";
export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => { const t = input.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(""); };
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
        {tags.map((t) => (
          <span key={t} style={{ background: "#eee", borderRadius: 12, padding: "2px 8px" }}>
            {t} <button onClick={() => onChange(tags.filter((x) => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="태그 입력 후 Enter" />
    </div>
  );
}
