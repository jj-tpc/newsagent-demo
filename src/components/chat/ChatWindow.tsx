"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatResult } from "@/lib/chat/orchestrator";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { PromptCard } from "./PromptCard";
import { Masthead } from "./Masthead";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const DEMO_PROMPTS = [
  "최근 금리 인상이 가계에 미치는 영향은?",
  "이번 주 가장 중요한 경제 뉴스 요약해줘",
  "AI 관련 정책 동향이 궁금해",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [askingReset, setAskingReset] = useState(false);

  // 최신 messages 길이를 ref로 (이벤트 핸들러에서 stale 클로저 회피)
  const hasMessagesRef = useRef(false);
  useEffect(() => { hasMessagesRef.current = messages.length > 0; }, [messages.length]);

  useEffect(() => {
    const handler = () => {
      if (hasMessagesRef.current) {
        setAskingReset(true);
      } else {
        setMessages([]);
      }
    };
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
        padding: "var(--space-xl) var(--space-md) var(--space-2xl)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "var(--space-2xl)",
        minHeight: "calc(100dvh - 64px)",
      }}
    >
      <Masthead />

      <div style={{ display: "grid", gap: "var(--space-lg)", alignContent: "start" }}>
        {messages.length === 0 && (
          <section aria-label="추천 질문" style={{ display: "grid", gap: "var(--space-sm)" }}>
            <span className="eyebrow">이런 것도 물어보세요</span>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-sm)",
            }}>
              {DEMO_PROMPTS.map((p) => <PromptCard key={p} text={p} onPick={send} />)}
            </div>
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
      </div>

      <Composer onSend={send} disabled={loading} />

      <ConfirmDialog
        open={askingReset}
        variant="danger"
        title="새 채팅 시작"
        body={<>현재 대화를 비우고 처음부터 시작합니다. 내용은 저장되지 않습니다.</>}
        confirmLabel="새로 시작"
        cancelLabel="취소"
        onConfirm={() => { setMessages([]); setAskingReset(false); }}
        onCancel={() => setAskingReset(false)}
      />
    </div>
  );
}
