import { it, expect } from "vitest";
import { MODEL_CATALOG, DEFAULT_PROVIDER, DEFAULT_MODELS } from "./models";

it("each provider's default model is present in its catalog", () => {
  for (const p of ["anthropic", "openai", "gemini"] as const) {
    const ids = MODEL_CATALOG[p].map((m) => m.id);
    expect(ids).toContain(DEFAULT_MODELS[p]);
  }
});
it("default provider is anthropic with sonnet 4.6 default", () => {
  expect(DEFAULT_PROVIDER).toBe("anthropic");
  expect(DEFAULT_MODELS.anthropic).toBe("claude-sonnet-4-6");
  expect(DEFAULT_MODELS.openai).toBe("gpt-5.4-mini");
  expect(DEFAULT_MODELS.gemini).toBe("gemini-3.5-flash");
});
