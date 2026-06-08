import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function model(modelId: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: modelId });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, modelId) {
    const res = await model(modelId).generateContent(
      (await buildSelectPrompt(question, candidates)) + "\n\nJSON만 출력하라.",
    );
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, modelId) {
    const res = await model(modelId).generateContent(await buildAnswerPrompt(question, articles));
    return res.response.text();
  },
  async *answerStream(question, articles, modelId) {
    const result = await model(modelId).generateContentStream(await buildAnswerPrompt(question, articles));
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) yield t;
    }
  },
};
