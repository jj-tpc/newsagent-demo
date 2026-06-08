"use client";
import { useId, useState } from "react";

export function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const id = useId();
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(""); } };
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      style={{ display: "flex", gap: "var(--space-xs)", alignItems: "stretch" }}
    >
      <label htmlFor={id} style={{
        position: "absolute", width: 1, height: 1, overflow: "hidden",
        clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
      }}>
        질문 입력
      </label>
      <input
        id={id}
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="질문을 입력하세요"
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn--primary" disabled={disabled || !text.trim()}>
        전송
      </button>
    </form>
  );
}
