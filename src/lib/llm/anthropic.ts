import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { LlmProvider } from "./types";
import { buildSelectPrompt, buildAnswerPrompt } from "./prompts";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

function text(msg: Message): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates, model) {
    const res = await client().messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: await buildSelectPrompt(question, candidates) }],
    });
    const raw = text(res).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles, model) {
    const res = await client().messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    return text(res);
  },
  async *answerStream(question, articles, model) {
    const stream = client().messages.stream({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: await buildAnswerPrompt(question, articles) }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  },
};
