export function PromptCard({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  return (
    <button onClick={() => onPick(text)} style={{ textAlign: "left", border: "1px solid #ddd", borderRadius: 10, padding: 12, cursor: "pointer", background: "#fafafa" }}>
      {text}
    </button>
  );
}
