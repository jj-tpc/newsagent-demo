"use client";
import { useId, useState } from "react";

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const id = useId();
  const add = () => { const t = input.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(""); };
  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      {tags.length > 0 && (
        <ul
          style={{
            display: "flex",
            gap: "var(--space-2xs)",
            flexWrap: "wrap",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {tags.map((t) => (
            <li key={t}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2xs)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: "var(--radius-pill)",
                  padding: "var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {t}
                <button
                  type="button"
                  aria-label={`${t} 태그 삭제`}
                  onClick={() => onChange(tags.filter((x) => x !== t))}
                  style={{
                    minWidth: 24,
                    height: 24,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    borderRadius: "var(--radius-pill)",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="태그 입력 후 Enter"
        aria-label="태그 추가"
      />
    </div>
  );
}
