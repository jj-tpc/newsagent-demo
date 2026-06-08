"use client";
import { useId } from "react";

export function PromptEditor({
  title, value, overridden, onChange, onSave, onReset,
}: {
  title: string;
  value: string;
  overridden: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const id = useId();
  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
        <label htmlFor={id} style={{ fontWeight: 700, color: "var(--text-strong)" }}>
          {title}
        </label>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: overridden ? "var(--warning)" : "var(--text-muted)",
            padding: "2px var(--space-xs)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-pill)",
            background: overridden
              ? "color-mix(in oklab, var(--warning) 14%, var(--surface))"
              : "var(--surface-2)",
          }}
        >
          {overridden ? "사용자 편집됨" : "기본값"}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        rows={10}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.55,
        }}
      />
      <div style={{ display: "flex", gap: "var(--space-xs)" }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={onSave}>저장</button>
        <button type="button" className="btn btn--sm" onClick={onReset}>기본값으로 초기화</button>
      </div>
    </div>
  );
}
