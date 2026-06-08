export function PromptEditor({
  title, value, overridden, onChange, onSave, onReset,
}: {
  title: string;
  value: string;
  overridden: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title}</strong>
        <span style={{ fontSize: 12, color: overridden ? "#b45309" : "#888" }}>
          {overridden ? "사용자 편집됨" : "기본값"}
        </span>
      </div>
      <textarea value={value} rows={10} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave}>저장</button>
        <button onClick={onReset}>기본값으로 초기화</button>
      </div>
    </div>
  );
}
