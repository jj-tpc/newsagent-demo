"use client";
import { useEffect, useState } from "react";
import type { ChatResult } from "@/lib/chat/orchestrator";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { PromptCard } from "./PromptCard";
import { Masthead } from "./Masthead";

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
    <div
      style={{
        maxWidth: "var(--content-narrow)",
        margin: "0 auto",
        padding: "var(--space-lg) var(--space-md)",
        display: "grid",
        gap: "var(--space-lg)",
      }}
    >
      <Masthead />

      <hr className="hairline" />

      {messages.length === 0 && (
        <section aria-label="추천 질문" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-sm)",
        }}>
          {DEMO_PROMPTS.map((p) => <PromptCard key={p} text={p} onPick={send} />)}
        </section>
      )}

      <MessageList messages={messages} />

      {loading && (
        <div
          role="status"
          aria-live="polite"
          style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}
        >
          답변 생성 중…
        </div>
      )}

      <Composer onSend={send} disabled={loading} />
    </div>
  );
}
