import type { ProviderName } from "@/lib/llm/types";
export function ProviderSelector({ value, onChange }: { value: ProviderName; onChange: (p: ProviderName) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ProviderName)}>
      <option value="anthropic">Anthropic</option>
      <option value="openai">GPT</option>
      <option value="gemini">Gemini</option>
    </select>
  );
}
