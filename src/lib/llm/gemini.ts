import type { LlmProvider } from "./types";
export const provider: LlmProvider = {
  async selectArticles() { throw new Error("not implemented"); },
  async answer() { throw new Error("not implemented"); },
};
