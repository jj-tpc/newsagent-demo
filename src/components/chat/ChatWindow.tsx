"use client";
import { useEffect, useState } from "react";
import type { ChatResult } from "@/lib/chat/orchestrator";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { PromptCard } from "./PromptCard";

const DEMO_PROMPTS = [
  "최근 금리 인상이 가계에 미치는 영향은?",
  "이번 주 가장 중요한 경제 뉴스 요약해줘",
  "AI 관련 정책 동향이 궁금해",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => setMessages([]);
    window.addEventListener("new-chat", handler);
    return () => window.removeEventListener("new-chat", handler);
  }, []);

  async function send(question: string) {
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as ChatResult & { error?: string };
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.error ? `오류: ${data.error}` : data.answer,
        polishedQuery: data.polishedQuery,
        sources: data.sources,
      }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h2>신문 에이전트</h2>
      {messages.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" }}>
          {DEMO_PROMPTS.map((p) => <PromptCard key={p} text={p} onPick={send} />)}
        </div>
      )}
      <MessageList messages={messages} />
      {loading && <div style={{ color: "#888" }}>답변 생성 중…</div>}
      <div style={{ marginTop: 12 }}><Composer onSend={send} disabled={loading} /></div>
    </div>
  );
}
