import type { UiMessage } from "./types";
import { InlineMarkdown } from "./InlineMarkdown";
import { SearchingIndicator } from "./SearchingIndicator";
import { SourceCard } from "./SourceCard";

export function MessageBubble({ msg }: { msg: UiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        margin: "var(--space-sm) 0",
      }}
    >
      <div
        style={{
          maxWidth: "min(640px, 88%)",
          background: isUser ? "var(--accent-soft)" : "var(--surface-2)",
          color: "var(--text)",
          padding: "var(--space-sm) var(--space-md)",
          borderRadius: "var(--radius-lg)",
          border: isUser ? "none" : "1px solid var(--border)",
        }}
      >
        {msg.polishedQuery && <SearchingIndicator query={msg.polishedQuery} />}
        {isUser ? <span>{msg.text}</span> : <InlineMarkdown text={msg.text} />}
        {msg.sources && msg.sources.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              flexWrap: "wrap",
              marginTop: "var(--space-sm)",
            }}
          >
            {msg.sources.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
