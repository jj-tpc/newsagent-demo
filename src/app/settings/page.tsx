"use client";
import { useEffect, useMemo, useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";
import { ProviderModelPicker } from "@/components/settings/ProviderModelPicker";
import { PromptEditor } from "@/components/settings/PromptEditor";
import { CrawlerPanel } from "@/components/settings/CrawlerPanel";

type Catalog = Record<ProviderName, ModelOption[]>;
type PromptState = { text: string; overridden: boolean };
type PromptName = "select" | "answer";

const PROMPT_TITLES: Record<PromptName, string> = {
  select: "기사 선택 프롬프트",
  answer: "답변 생성 프롬프트",
};
const PROMPT_HINTS: Record<PromptName, string> = {
  select: "사용자 질문을 보고 어떤 기사를 참고할지 고르는 지시입니다.",
  answer: "선택된 기사를 바탕으로 답변을 만들 때 따르는 지시입니다.",
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<ProviderName>("anthropic");
  const [savedProvider, setSavedProvider] = useState<ProviderName>("anthropic");
  const [models, setModels] = useState<Record<ProviderName, string>>({
    anthropic: "", openai: "", gemini: "",
  });
  const [savedModels, setSavedModels] = useState<Record<ProviderName, string>>({
    anthropic: "", openai: "", gemini: "",
  });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [prompts, setPrompts] = useState<{ select: PromptState; answer: PromptState } | null>(null);
  const [savedPromptText, setSavedPromptText] = useState<{ select: string; answer: string }>({ select: "", answer: "" });
  const [statusMsg, setStatusMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  useEffect(() => {
    (async () => {
      const s = await (await fetch("/api/settings")).json();
      setProvider(s.provider);
      setSavedProvider(s.provider);
      setModels(s.models);
      setSavedModels(s.models);
      setCatalog(s.catalog);
      const p = await (await fetch("/api/prompts")).json();
      setPrompts(p);
      setSavedPromptText({ select: p.select.text, answer: p.answer.text });
    })();
  }, []);

  const modelDirty = useMemo(() => {
    if (provider !== savedProvider) return true;
    return (Object.keys(models) as ProviderName[]).some((p) => models[p] !== savedModels[p]);
  }, [provider, savedProvider, models, savedModels]);

  function promptDirty(name: PromptName): boolean {
    return !!prompts && prompts[name].text !== savedPromptText[name];
  }

  function flashStatus(text: string, kind: "success" | "error" = "success") {
    setStatusMsg({ text, kind });
    setTimeout(() => setStatusMsg(null), 2500);
  }

  async function saveSettings() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, models }),
      });
      const s = await res.json();
      setProvider(s.provider);
      setSavedProvider(s.provider);
      setModels(s.models);
      setSavedModels(s.models);
      flashStatus("모델 설정을 저장했습니다.");
    } catch {
      flashStatus("저장 중 문제가 발생했습니다.", "error");
    }
  }

  async function savePrompt(name: PromptName) {
    if (!prompts) return;
    try {
      await fetch("/api/prompts", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, text: prompts[name].text }),
      });
      setPrompts({ ...prompts, [name]: { ...prompts[name], overridden: true } });
      setSavedPromptText((s) => ({ ...s, [name]: prompts[name].text }));
      flashStatus(`${PROMPT_TITLES[name]}을(를) 저장했습니다.`);
    } catch {
      flashStatus("저장 중 문제가 발생했습니다.", "error");
    }
  }

  async function resetPrompt(name: PromptName) {
    if (!prompts) return;
    const res = await fetch("/api/prompts/reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const { text } = await res.json();
    setPrompts({ ...prompts, [name]: { text, overridden: false } });
    setSavedPromptText((s) => ({ ...s, [name]: text }));
    flashStatus(`${PROMPT_TITLES[name]}을(를) 기본값으로 되돌렸습니다.`);
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

      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            color: statusMsg.kind === "success" ? "var(--success)" : "var(--danger)",
            fontSize: "var(--text-sm)",
            background:
              statusMsg.kind === "success"
                ? "color-mix(in oklab, var(--success) 12%, var(--surface))"
                : "color-mix(in oklab, var(--danger) 12%, var(--surface))",
            border:
              "1px solid " +
              (statusMsg.kind === "success"
                ? "color-mix(in oklab, var(--success) 30%, var(--border))"
                : "color-mix(in oklab, var(--danger) 30%, var(--border))"),
            padding: "var(--space-xs) var(--space-sm)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <SectionHeader title="AI 모델" dirty={modelDirty}>
          답변과 기사 선택에 사용할 모델 제공사와 모델을 고릅니다.
        </SectionHeader>
        {catalog && (
          <ProviderModelPicker
            provider={provider} models={models} catalog={catalog}
            onProvider={setProvider}
            onModel={(id) => setModels({ ...models, [provider]: id })}
          />
        )}
        <div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={saveSettings}
            disabled={!modelDirty}
          >
            모델 설정 저장
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <SectionHeader
          title="프롬프트"
          dirty={promptDirty("select") || promptDirty("answer")}
        >
          신문 에이전트가 따르는 두 가지 지시문입니다. 비워두면 기본값이 사용됩니다.
        </SectionHeader>
        {prompts && (
          <div style={{ display: "grid", gap: "var(--space-lg)" }}>
            <PromptEditor
              title={PROMPT_TITLES.select}
              description={PROMPT_HINTS.select}
              value={prompts.select.text}
              overridden={prompts.select.overridden}
              dirty={promptDirty("select")}
              onChange={(t) => setPrompts({ ...prompts, select: { ...prompts.select, text: t } })}
              onSave={() => savePrompt("select")}
              onReset={() => resetPrompt("select")}
            />
            <PromptEditor
              title={PROMPT_TITLES.answer}
              description={PROMPT_HINTS.answer}
              value={prompts.answer.text}
              overridden={prompts.answer.overridden}
              dirty={promptDirty("answer")}
              onChange={(t) => setPrompts({ ...prompts, answer: { ...prompts.answer, text: t } })}
              onSave={() => savePrompt("answer")}
              onReset={() => resetPrompt("answer")}
            />
          </div>
        )}
      </section>

      <CrawlerPanel />
    </div>
  );
}

function SectionHeader({
  title, dirty, children,
}: {
  title: string;
  dirty: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {dirty && (
          <span
            className="eyebrow"
            style={{ color: "var(--warning)" }}
            aria-label="저장하지 않은 변경 사항이 있습니다"
          >
            • 저장 필요
          </span>
        )}
      </div>
      {children && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0, maxWidth: "60ch" }}>
          {children}
        </p>
      )}
    </div>
  );
}
