import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeSettingsStore } from "./settings";
import { LocalFsFileStore } from "../storage/local-fs-store";

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "settings-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

function makeStore() {
  return makeSettingsStore(new LocalFsFileStore(root));
}

it("returns defaults when file is absent", async () => {
  const s = await makeStore().get();
  expect(s.provider).toBe("anthropic");
  expect(s.models.openai).toBe("gpt-5.4-mini");
  expect(s.maxSources).toBe(3);
  expect(s.maxImages).toBe(3);
});

it("merges missing keys and corrects out-of-catalog models to defaults", async () => {
  await new LocalFsFileStore(root).write(
    "config/settings.json",
    JSON.stringify({ provider: "openai", models: { openai: "made-up-model" } }),
    "application/json",
  );
  const s = await makeStore().get();
  expect(s.provider).toBe("openai");
  expect(s.models.openai).toBe("gpt-5.4-mini");
  expect(s.models.gemini).toBe("gemini-3.5-flash");
});

it("falls back to default provider when provider invalid", async () => {
  await new LocalFsFileStore(root).write(
    "config/settings.json",
    JSON.stringify({ provider: "bogus" }),
    "application/json",
  );
  expect((await makeStore().get()).provider).toBe("anthropic");
});

it("save merges patch, validates, persists, and returns normalized settings", async () => {
  const store = makeStore();
  const saved = await store.save({ provider: "gemini", models: { gemini: "gemini-3.1-pro" } as never });
  expect(saved.provider).toBe("gemini");
  expect(saved.models.gemini).toBe("gemini-3.1-pro");
  const reread = await makeStore().get();
  expect(reread.provider).toBe("gemini");
  expect(reread.models.gemini).toBe("gemini-3.1-pro");
});

it("clamps maxSources and maxImages to valid ranges", async () => {
  const store = makeStore();
  const saved = await store.save({ maxSources: 99, maxImages: -5 });
  expect(saved.maxSources).toBe(10);
  expect(saved.maxImages).toBe(0);
});
