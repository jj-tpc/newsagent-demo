import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";

const LABELS: Record<ProviderName, string> = { anthropic: "Anthropic", openai: "OpenAI", gemini: "Google" };

export function ProviderModelPicker({
  provider, models, catalog, onProvider, onModel,
}: {
  provider: ProviderName;
  models: Record<ProviderName, string>;
  catalog: Record<ProviderName, ModelOption[]>;
  onProvider: (p: ProviderName) => void;
  onModel: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
      <label>
        프로바이더{" "}
        <select value={provider} onChange={(e) => onProvider(e.target.value as ProviderName)}>
          {(Object.keys(LABELS) as ProviderName[]).map((p) => (
            <option key={p} value={p}>{LABELS[p]}</option>
          ))}
        </select>
      </label>
      <label>
        모델{" "}
        <select value={models[provider]} onChange={(e) => onModel(e.target.value)}>
          {catalog[provider].map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
