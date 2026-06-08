"use client";
import { useId } from "react";

export function PromptEditor({
  title, description, value, overridden, dirty, onChange, onSave, onReset,
}: {
  title: string;
  description?: string;
  value: string;
  overridden: boolean;
  dirty: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const id = useId();
  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
        <label htmlFor={id} style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "var(--text-lg)",
          color: "var(--text-strong)",
          letterSpacing: "-0.01em",
        }}>
          {title}
        </label>
        <div style={{ display: "flex", gap: "var(--space-2xs)", alignItems: "center", flexShrink: 0 }}>
          {dirty && (
            <span
              className="eyebrow"
              style={{ color: "var(--warning)" }}
              aria-label="저장하지 않은 변경 사항이 있습니다"
            >
              • 저장 필요
            </span>
          )}
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
      </div>
      {description && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0, maxWidth: "60ch" }}>
          {description}
        </p>
      )}
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
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onSave}
          disabled={!dirty}
        >
          저장
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={onReset}
          disabled={!overridden}
        >
          기본값으로 되돌리기
        </button>
      </div>
    </div>
  );
}
