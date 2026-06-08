import fs from "node:fs/promises";
import path from "node:path";

export type PromptName = "select" | "answer";

export function makePromptStore(activeDir: string, defaultsDir: string) {
  const activeFile = (n: PromptName) => path.join(activeDir, `${n}.md`);
  const defaultFile = (n: PromptName) => path.join(defaultsDir, `${n}.md`);
  return {
    async getDefault(name: PromptName): Promise<string> {
      return fs.readFile(defaultFile(name), "utf8");
    },
    async isOverridden(name: PromptName): Promise<boolean> {
      try { await fs.access(activeFile(name)); return true; } catch { return false; }
    },
    async get(name: PromptName): Promise<string> {
      try { return await fs.readFile(activeFile(name), "utf8"); }
      catch { return fs.readFile(defaultFile(name), "utf8"); }
    },
    async set(name: PromptName, text: string): Promise<void> {
      await fs.mkdir(activeDir, { recursive: true });
      await fs.writeFile(activeFile(name), text, "utf8");
    },
    async reset(name: PromptName): Promise<void> {
      try { await fs.unlink(activeFile(name)); } catch { /* already default */ }
    },
  };
}

export const promptStore = makePromptStore(
  path.join(process.cwd(), "data", "prompts"),
  path.join(process.cwd(), "prompts", "defaults"),
);
