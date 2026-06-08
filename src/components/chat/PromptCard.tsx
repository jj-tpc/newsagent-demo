export function PromptCard({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      style={{
        textAlign: "left",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-sm) var(--space-md)",
        cursor: "pointer",
        background: "var(--surface)",
        color: "var(--text)",
        minHeight: 56,
        lineHeight: 1.4,
        transition: "background 140ms ease, border-color 140ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {text}
    </button>
  );
}
