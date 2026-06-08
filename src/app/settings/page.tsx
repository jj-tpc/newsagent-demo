"use client";
import { useEffect, useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";
import { ProviderModelPicker } from "@/components/settings/ProviderModelPicker";
import { PromptEditor } from "@/components/settings/PromptEditor";
import { CrawlerPanel } from "@/components/settings/CrawlerPanel";

type Catalog = Record<ProviderName, ModelOption[]>;
type PromptState = { text: string; overridden: boolean };

export default function SettingsPage() {
  const [provider, setProvider] = useState<ProviderName>("anthropic");
  const [models, setModels] = useState<Record<ProviderName, string>>({
    anthropic: "", openai: "", gemini: "",
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [prompts, setPrompts] = useState<{ select: PromptState; answer: PromptState } | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    (async () => {
      const s = await (await fetch("/api/settings")).json();
      setProvider(s.provider);
      setModels(s.models);
      setCatalog(s.catalog);
      const p = await (await fetch("/api/prompts")).json();
      setPrompts(p);
    })();
  }, []);

  async function saveSettings() {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, models }),
    });
    const s = await res.json();
    setProvider(s.provider); setModels(s.models);
    setSavedMsg("설정 저장됨"); setTimeout(() => setSavedMsg(""), 2000);
  }

  async function savePrompt(name: "select" | "answer") {
    if (!prompts) return;
    await fetch("/api/prompts", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, text: prompts[name].text }),
    });
    setPrompts({ ...prompts, [name]: { ...prompts[name], overridden: true } });
    setSavedMsg(`${name} 프롬프트 저장됨`); setTimeout(() => setSavedMsg(""), 2000);
  }

  async function resetPrompt(name: "select" | "answer") {
    if (!prompts) return;
    const res = await fetch("/api/prompts/reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const { text } = await res.json();
    setPrompts({ ...prompts, [name]: { text, overridden: false } });
  }

  return (
    <div
      style={{
        maxWidth: "var(--content-narrow)",
        margin: "0 auto",
        padding: "var(--space-lg) var(--space-md)",
        display: "grid",
        gap: "var(--space-2xl)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <span className="eyebrow">에디터 도구</span>
        <h1 style={{ margin: 0 }}>설정</h1>
        <hr className="hairline" style={{ marginTop: "var(--space-xs)" }} />
      </header>

      {savedMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            color: "var(--success)",
            fontSize: "var(--text-sm)",
            background: "color-mix(in oklab, var(--success) 12%, var(--surface))",
            border: "1px solid color-mix(in oklab, var(--success) 30%, var(--border))",
            padding: "var(--space-xs) var(--space-sm)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {savedMsg}
        </div>
      )}

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <h2>LLM 프로바이더 / 모델</h2>
        {catalog && (
          <ProviderModelPicker
            provider={provider} models={models} catalog={catalog}
            onProvider={setProvider}
            onModel={(id) => setModels({ ...models, [provider]: id })}
          />
        )}
        <div>
          <button type="button" className="btn btn--primary" onClick={saveSettings}>
            설정 저장
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <h2>프롬프트</h2>
        {prompts && (
          <div style={{ display: "grid", gap: "var(--space-lg)" }}>
            <PromptEditor title="검색/선택 프롬프트 (select)" value={prompts.select.text}
              overridden={prompts.select.overridden}
              onChange={(t) => setPrompts({ ...prompts, select: { ...prompts.select, text: t } })}
              onSave={() => savePrompt("select")} onReset={() => resetPrompt("select")} />
            <PromptEditor title="답변 프롬프트 (answer)" value={prompts.answer.text}
              overridden={prompts.answer.overridden}
              onChange={(t) => setPrompts({ ...prompts, answer: { ...prompts.answer, text: t } })}
              onSave={() => savePrompt("answer")} onReset={() => resetPrompt("answer")} />
          </div>
        )}
      </section>

      <CrawlerPanel />
    </div>
  );
}
