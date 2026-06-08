import { useId } from "react";
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
  const providerId = useId();
  const modelId = useId();
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        maxWidth: 520,
      }}
    >
      <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <label htmlFor={providerId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          제공사
        </label>
        <select
          id={providerId}
          value={provider}
          onChange={(e) => onProvider(e.target.value as ProviderName)}
        >
          {(Object.keys(LABELS) as ProviderName[]).map((p) => (
            <option key={p} value={p}>{LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <label htmlFor={modelId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          모델
        </label>
        <select id={modelId} value={models[provider]} onChange={(e) => onModel(e.target.value)}>
          {catalog[provider].map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
