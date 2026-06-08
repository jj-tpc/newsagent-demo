import type { ProviderName } from "./types";

export interface ModelOption {
  id: string;
  label: string;
}

export const MODEL_CATALOG: Record<ProviderName, ModelOption[]> = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    { id: "gpt-5.5", label: "GPT-5.5" },
    { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    { id: "gpt-5.2", label: "GPT-5.2" },
  ],
  gemini: [
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  ],
};

export const DEFAULT_PROVIDER: ProviderName = "anthropic";

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.4-mini",
  gemini: "gemini-3.5-flash",
};
