import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeSettingsStore } from "./settings";

let dir: string;
let file: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "settings-")); file = path.join(dir, "settings.json"); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

it("returns defaults when file is absent", async () => {
  const store = makeSettingsStore(file);
  const s = await store.get();
  expect(s.provider).toBe("anthropic");
  expect(s.models.openai).toBe("gpt-5.4-mini");
});

it("merges missing keys and corrects out-of-catalog models to defaults", async () => {
  fs.writeFileSync(file, JSON.stringify({ provider: "openai", models: { openai: "made-up-model" } }));
  const store = makeSettingsStore(file);
  const s = await store.get();
  expect(s.provider).toBe("openai");
  expect(s.models.openai).toBe("gpt-5.4-mini");
  expect(s.models.gemini).toBe("gemini-3.5-flash");
});

it("falls back to default provider when provider invalid", async () => {
  fs.writeFileSync(file, JSON.stringify({ provider: "bogus" }));
  const store = makeSettingsStore(file);
  expect((await store.get()).provider).toBe("anthropic");
});

it("save merges patch, validates, persists, and returns normalized settings", async () => {
  const store = makeSettingsStore(file);
  const saved = await store.save({ provider: "gemini", models: { gemini: "gemini-3.1-pro" } as never });
  expect(saved.provider).toBe("gemini");
  expect(saved.models.gemini).toBe("gemini-3.1-pro");
  const reread = await makeSettingsStore(file).get();
  expect(reread.provider).toBe("gemini");
  expect(reread.models.gemini).toBe("gemini-3.1-pro");
});
