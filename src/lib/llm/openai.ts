import OpenAI from "openai";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, model) {
    const res = await client().chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: await buildSelectPrompt(question, candidates) }],
    });
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, model) {
    const res = await client().chat.completions.create({
      model,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    return res.choices[0].message.content ?? "";
  },
  async *answerStream(question, articles, model) {
    const stream = await client().chat.completions.create({
      model,
      stream: true,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};
