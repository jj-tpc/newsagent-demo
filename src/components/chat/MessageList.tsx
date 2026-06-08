import type { UiMessage } from "./types";
import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages }: { messages: UiMessage[] }) {
  return (
    <div>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        // 새로운 사용자 질문은 이전 묶음과 시각적으로 떨어진다.
        // 답변 직후 다시 사용자 질문이 시작될 때 = 새 묶음.
        const startsNewExchange = m.role === "user" && prev?.role === "assistant";
        const isFirst = i === 0;
        return (
          <MessageBubble
            key={i}
            msg={m}
            topGap={isFirst ? "none" : startsNewExchange ? "lg" : "sm"}
          />
        );
      })}
    </div>
  );
}
