export function PromptCard({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  return (
    <button
      type="button"
      className="paper-card"
      onClick={() => onPick(text)}
      style={{
        textAlign: "left",
        padding: "var(--space-sm) var(--space-md)",
        minHeight: 56,
        lineHeight: 1.45,
        font: "inherit",
        color: "var(--text)",
      }}
    >
      {text}
    </button>
  );
}
