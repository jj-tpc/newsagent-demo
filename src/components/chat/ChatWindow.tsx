"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatSource } from "@/lib/chat/orchestrator";
import { readSse } from "@/lib/chat/sse-client";
import type { UiMessage } from "./types";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { PromptCard } from "./PromptCard";
import { LoadingNote } from "./LoadingNote";
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
    setMessages((m) => [
      ...m,
      { role: "user", text: question },
      { role: "assistant", text: "" }, // 자리 잡고 스트림으로 채움
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) {
        const msg = res.ok ? "응답 본문이 없습니다." : `오류 ${res.status}`;
        patchAssistant({ text: msg });
        return;
      }

      let assistantText = "";
      for await (const ev of readSse(res.body)) {
        if (ev.event === "meta") {
          const meta = JSON.parse(ev.data) as { polishedQuery: string; sources: ChatSource[] };
          patchAssistant({ polishedQuery: meta.polishedQuery, sources: meta.sources });
        } else if (ev.event === "delta") {
          const { text } = JSON.parse(ev.data) as { text: string };
          assistantText += text;
          patchAssistant({ text: assistantText });
        } else if (ev.event === "error") {
          const { message } = JSON.parse(ev.data) as { message: string };
          patchAssistant({ text: `오류: ${message}` });
          break;
        } else if (ev.event === "done") {
          break;
        }
      }
    } catch (e) {
      patchAssistant({ text: `오류: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }

  function patchAssistant(patch: Partial<UiMessage>) {
    setMessages((m) => {
      if (m.length === 0) return m;
      const next = [...m];
      const last = next[next.length - 1];
      if (last.role !== "assistant") return m;
      next[next.length - 1] = { ...last, ...patch };
      return next;
    });
  }

  return (
    <div
      style={{
        maxWidth: "var(--content-wide)",
        margin: "0 auto",
        padding: "var(--space-lg) var(--space-md) var(--space-2xl)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "var(--space-lg)",
        minHeight: "calc(100dvh - 64px)",
      }}
    >
      <Masthead />

      <div style={{ display: "grid", gap: "var(--space-lg)", alignContent: "start" }}>
        {/* sr-only h1 — 시각은 비우고, 페이지 랜드마크는 유지 */}
        <h1 style={{
          position: "absolute", width: 1, height: 1, overflow: "hidden",
          clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
        }}>
          신문 에이전트
        </h1>

        {messages.length === 0 && (
          <section aria-label="추천 질문" style={{ display: "grid", gap: "var(--space-sm)" }}>
            <span className="eyebrow">이런 것도 물어보세요</span>
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "var(--space-xs)",
            }}>
              {DEMO_PROMPTS.map((p) => <PromptCard key={p} text={p} onPick={send} />)}
            </div>
          </section>
        )}

        <MessageList messages={messages} />

        {/* 답변 첫 토큰이 도착하기 전까지만 안내 */}
        {loading && messages[messages.length - 1]?.role === "assistant"
          && messages[messages.length - 1]?.text === "" && <LoadingNote />}
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
