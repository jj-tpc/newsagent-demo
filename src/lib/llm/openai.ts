import OpenAI from "openai";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "gpt-4o";

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await client().chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: selectPrompt(question, candidates) }],
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles) {
    const res = await client().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: answerPrompt(question, articles) }],
    });
    return res.choices[0].message.content ?? "";
  },
};
