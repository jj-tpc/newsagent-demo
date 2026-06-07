import type { LlmProvider, ProviderName } from "./types";
import { provider as anthropic } from "./anthropic";
import { provider as openai } from "./openai";
import { provider as gemini } from "./gemini";

const registry: Record<ProviderName, LlmProvider> = { anthropic, openai, gemini };

export function getProvider(name: ProviderName): LlmProvider {
  const p = registry[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}
