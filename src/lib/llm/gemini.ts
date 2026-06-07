import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "gemini-2.0-flash";

function model() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await model().generateContent(
      selectPrompt(question, candidates) + "\n\nJSON만 출력하라.",
    );
    const raw = res.response.text().trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles) {
    const res = await model().generateContent(answerPrompt(question, articles));
    return res.response.text();
  },
};
