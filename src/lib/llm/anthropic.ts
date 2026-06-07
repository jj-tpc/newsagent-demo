import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { LlmProvider } from "./types";
import { selectPrompt, answerPrompt } from "./prompts";

const MODEL = "claude-opus-4-8";

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

// Extract concatenated text from a typed SDK Message.
// Using a type-narrowing check on each block so tsc accepts the union.
function text(msg: Message): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

export const provider: LlmProvider = {
  async selectArticles(question, candidates) {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: selectPrompt(question, candidates) }],
    });
    const raw = text(res).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    return {
      polishedQuery: String(parsed.polishedQuery ?? question),
      selectedIds: parsed.selectedIds ?? [],
    };
  },
  async answer(question, articles) {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: answerPrompt(question, articles) }],
    });
    return text(res);
  },
};
