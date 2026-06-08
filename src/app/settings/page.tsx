"use client";
import { useEffect, useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";
import { ProviderModelPicker } from "@/components/settings/ProviderModelPicker";
import { PromptEditor } from "@/components/settings/PromptEditor";

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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16, display: "grid", gap: 24 }}>
      <h2>설정</h2>
      {savedMsg && <div style={{ color: "#16a34a" }}>{savedMsg}</div>}

      <section>
        <h3>LLM 프로바이더 / 모델</h3>
        {catalog && (
          <ProviderModelPicker
            provider={provider} models={models} catalog={catalog}
            onProvider={setProvider}
            onModel={(id) => setModels({ ...models, [provider]: id })}
          />
        )}
        <div style={{ marginTop: 8 }}><button onClick={saveSettings}>설정 저장</button></div>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <h3>프롬프트</h3>
        {prompts && (
          <>
            <PromptEditor title="검색/선택 프롬프트 (select)" value={prompts.select.text}
              overridden={prompts.select.overridden}
              onChange={(t) => setPrompts({ ...prompts, select: { ...prompts.select, text: t } })}
              onSave={() => savePrompt("select")} onReset={() => resetPrompt("select")} />
            <PromptEditor title="답변 프롬프트 (answer)" value={prompts.answer.text}
              overridden={prompts.answer.overridden}
              onChange={(t) => setPrompts({ ...prompts, answer: { ...prompts.answer, text: t } })}
              onSave={() => savePrompt("answer")} onReset={() => resetPrompt("answer")} />
          </>
        )}
      </section>
    </div>
  );
}
