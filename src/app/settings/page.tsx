"use client";
import { useEffect, useId, useMemo, useState } from "react";
import type { ProviderName } from "@/lib/llm/types";
import type { ModelOption } from "@/lib/llm/models";
import { ProviderModelPicker } from "@/components/settings/ProviderModelPicker";
import { PromptEditor } from "@/components/settings/PromptEditor";
import { CrawlerPanel } from "@/components/settings/CrawlerPanel";

const MAX_SOURCES_RANGE = { min: 1, max: 10 };
const MAX_IMAGES_RANGE = { min: 0, max: 6 };

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
  const [maxSources, setMaxSources] = useState(3);
  const [savedMaxSources, setSavedMaxSources] = useState(3);
  const [maxImages, setMaxImages] = useState(3);
  const [savedMaxImages, setSavedMaxImages] = useState(3);
  const [prompts, setPrompts] = useState<{ select: PromptState; answer: PromptState } | null>(null);
  const [savedPromptText, setSavedPromptText] = useState<{ select: string; answer: string }>({ select: "", answer: "" });
  const [statusMsg, setStatusMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const maxSourcesId = useId();
  const maxImagesId = useId();

  useEffect(() => {
    (async () => {
      const s = await (await fetch("/api/settings")).json();
      setProvider(s.provider);
      setSavedProvider(s.provider);
      setModels(s.models);
      setSavedModels(s.models);
      setMaxSources(s.maxSources);
      setSavedMaxSources(s.maxSources);
      setMaxImages(s.maxImages);
      setSavedMaxImages(s.maxImages);
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

  const limitsDirty = maxSources !== savedMaxSources || maxImages !== savedMaxImages;

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

  async function saveLimits() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxSources, maxImages }),
      });
      const s = await res.json();
      setMaxSources(s.maxSources);
      setSavedMaxSources(s.maxSources);
      setMaxImages(s.maxImages);
      setSavedMaxImages(s.maxImages);
      flashStatus("답변 한도를 저장했습니다.");
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
        <hr className="hairline" aria-hidden style={{ marginTop: "var(--space-xs)" }} />
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

      <hr className="hairline" aria-hidden />

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <SectionHeader title="답변 한도" dirty={limitsDirty}>
          한 답변에 참고할 기사 수와 본문에 포함될 이미지 수의 상한입니다.
          값이 작을수록 답변이 간결해집니다.
        </SectionHeader>
        <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: "var(--space-2xs)", minWidth: 200 }}>
            <label htmlFor={maxSourcesId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              참조 기사 수 (1–{MAX_SOURCES_RANGE.max})
            </label>
            <input
              id={maxSourcesId}
              type="number"
              min={MAX_SOURCES_RANGE.min}
              max={MAX_SOURCES_RANGE.max}
              value={maxSources}
              onChange={(e) => setMaxSources(
                Math.max(MAX_SOURCES_RANGE.min, Math.min(MAX_SOURCES_RANGE.max, Number(e.target.value) || MAX_SOURCES_RANGE.min)),
              )}
              style={{ maxWidth: 120 }}
            />
          </div>
          <div style={{ display: "grid", gap: "var(--space-2xs)", minWidth: 200 }}>
            <label htmlFor={maxImagesId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              이미지 수 ({MAX_IMAGES_RANGE.min}–{MAX_IMAGES_RANGE.max}, 0이면 미사용)
            </label>
            <input
              id={maxImagesId}
              type="number"
              min={MAX_IMAGES_RANGE.min}
              max={MAX_IMAGES_RANGE.max}
              value={maxImages}
              onChange={(e) => setMaxImages(
                Math.max(MAX_IMAGES_RANGE.min, Math.min(MAX_IMAGES_RANGE.max, Number(e.target.value) || 0)),
              )}
              style={{ maxWidth: 120 }}
            />
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={saveLimits}
            disabled={!limitsDirty}
          >
            답변 한도 저장
          </button>
        </div>
      </section>

      <hr className="hairline" aria-hidden />

      <section style={{ display: "grid", gap: "var(--space-md)" }}>
        <SectionHeader
          title="프롬프트"
          dirty={promptDirty("select") || promptDirty("answer")}
        >
          신문 에이전트가 따르는 두 가지 지시문입니다. 비워두면 기본값이 사용됩니다.
        </SectionHeader>
        {prompts && (
          <div style={{ display: "grid", gap: "var(--space-xl)" }}>
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

      <hr className="hairline" aria-hidden />

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
