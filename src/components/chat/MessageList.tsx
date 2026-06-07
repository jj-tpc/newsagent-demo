import type { UiMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
export function MessageList({ messages }: { messages: UiMessage[] }) {
  return <div>{messages.map((m, i) => <MessageBubble key={i} msg={m} />)}</div>;
}
