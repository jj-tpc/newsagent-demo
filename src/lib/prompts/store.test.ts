import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makePromptStore } from "./store";

let root: string, activeDir: string, defaultsDir: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-"));
  activeDir = path.join(root, "active");
  defaultsDir = path.join(root, "defaults");
  fs.mkdirSync(defaultsDir, { recursive: true });
  fs.writeFileSync(path.join(defaultsDir, "select.md"), "DEFAULT SELECT {{question}}");
  fs.writeFileSync(path.join(defaultsDir, "answer.md"), "DEFAULT ANSWER {{question}}");
});
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

it("returns default when no active override", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  expect(await store.get("select")).toContain("DEFAULT SELECT");
  expect(await store.isOverridden("select")).toBe(false);
});

it("returns active after set, and reports overridden", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("select", "CUSTOM {{question}}");
  expect(await store.get("select")).toBe("CUSTOM {{question}}");
  expect(await store.isOverridden("select")).toBe(true);
});

it("reset removes active override and returns to default", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("answer", "CUSTOM");
  await store.reset("answer");
  expect(await store.isOverridden("answer")).toBe(false);
  expect(await store.get("answer")).toContain("DEFAULT ANSWER");
});

it("getDefault always returns the default text", async () => {
  const store = makePromptStore(activeDir, defaultsDir);
  await store.set("select", "CUSTOM");
  expect(await store.getDefault("select")).toContain("DEFAULT SELECT");
});
