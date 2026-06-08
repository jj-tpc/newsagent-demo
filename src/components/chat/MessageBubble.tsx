import type { UiMessage } from "./types";
import { InlineMarkdown } from "./InlineMarkdown";
import { SearchingIndicator } from "./SearchingIndicator";
import { SourceCard } from "./SourceCard";

type TopGap = "none" | "sm" | "lg";
const TOP_GAP: Record<TopGap, string> = {
  none: "0",
  sm: "var(--space-sm)",
  lg: "var(--space-xl)",
};

export function MessageBubble({ msg, topGap = "sm" }: { msg: UiMessage; topGap?: TopGap }) {
  const isUser = msg.role === "user";
  return (
    <div
      className="enter-up"
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginTop: TOP_GAP[topGap],
      }}
    >
      <div
        style={{
          maxWidth: "min(640px, 88%)",
          background: isUser ? "var(--surface-quote)" : "var(--surface-2)",
          color: "var(--text)",
          padding: "var(--space-sm) var(--space-md)",
          borderRadius: "var(--radius-lg)",
          border: isUser
            ? "1px solid color-mix(in oklab, var(--accent) 18%, var(--border))"
            : "1px solid var(--border)",
        }}
      >
        {msg.polishedQuery && <SearchingIndicator query={msg.polishedQuery} />}
        {isUser ? <span>{msg.text}</span> : <InlineMarkdown text={msg.text} />}
        {msg.sources && msg.sources.length > 0 && (
          <div
            role="list"
            aria-label="참조 기사"
            style={{
              display: "flex",
              gap: "var(--space-xs)",
              flexWrap: "nowrap",
              overflowX: "auto",
              marginTop: "var(--space-sm)",
              paddingBottom: "var(--space-2xs)",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "thin",
              // 버블의 padding 안에서 끝까지 스크롤되도록 여백
              marginInline: "calc(var(--space-md) * -1)",
              paddingInline: "var(--space-md)",
            }}
          >
            {msg.sources.map((s) => (
              <div
                key={s.id}
                role="listitem"
                style={{ flex: "0 0 auto", scrollSnapAlign: "start" }}
              >
                <SourceCard source={s} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
