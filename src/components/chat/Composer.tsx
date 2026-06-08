"use client";
import { useEffect, useId, useRef, useState } from "react";

const MIN_H = 44;   // px — 한 줄 + 패딩
const MAX_H = 180;  // px — 약 7-8줄

export function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const id = useId();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(MAX_H, Math.max(MIN_H, ta.scrollHeight))}px`;
  }, [text]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 IME 조합 중에는 Enter 무시 (조합 확정용)
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      style={{ display: "grid", gap: "var(--space-2xs)" }}
    >
      <label
        htmlFor={id}
        style={{
          position: "absolute", width: 1, height: 1, overflow: "hidden",
          clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
        }}
      >
        질문 입력
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--space-xs)",
          alignItems: "end",
        }}
      >
        <textarea
          ref={taRef}
          id={id}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="질문을 입력하세요"
          rows={1}
          style={{
            minHeight: MIN_H,
            maxHeight: MAX_H,
            resize: "none",
            lineHeight: 1.55,
            paddingTop: "var(--space-sm)",
            paddingBottom: "var(--space-sm)",
            overflowY: "auto",
          }}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={disabled || !text.trim()}
          style={{ alignSelf: "end" }}
        >
          전송
        </button>
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          textAlign: "right",
        }}
      >
        Enter로 전송 · Shift + Enter로 줄바꿈
      </div>
    </form>
  );
}
