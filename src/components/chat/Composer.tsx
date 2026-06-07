import { useState } from "react";
export function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const send = () => { if (text.trim()) { onSend(text.trim()); setText(""); } };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={text} disabled={disabled} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()} placeholder="질문을 입력하세요"
        style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }} />
      <button onClick={send} disabled={disabled}>전송</button>
    </div>
  );
}
