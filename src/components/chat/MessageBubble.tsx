import type { UiMessage } from "./types";
import { InlineMarkdown } from "./InlineMarkdown";
import { SearchingIndicator } from "./SearchingIndicator";
import { SourceCard } from "./SourceCard";

export function MessageBubble({ msg }: { msg: UiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", margin: "8px 0" }}>
      <div style={{ maxWidth: 640, background: isUser ? "#dbeafe" : "#f3f4f6", padding: 12, borderRadius: 12 }}>
        {msg.polishedQuery && <SearchingIndicator query={msg.polishedQuery} />}
        {isUser ? <span>{msg.text}</span> : <InlineMarkdown text={msg.text} />}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {msg.sources.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
