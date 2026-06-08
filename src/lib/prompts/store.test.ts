import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makePromptStore, type PromptName } from "./store";
import { LocalFsFileStore } from "../storage/local-fs-store";

let root: string;
const DEFAULTS: Record<PromptName, string> = {
  select: "DEFAULT SELECT {{question}}",
  answer: "DEFAULT ANSWER {{question}}",
};
const readDefault = async (n: PromptName) => DEFAULTS[n];

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

it("returns default when no active override", async () => {
  const store = makePromptStore(new LocalFsFileStore(root), readDefault);
  expect(await store.get("select")).toContain("DEFAULT SELECT");
  expect(await store.isOverridden("select")).toBe(false);
});

it("returns active after set, and reports overridden", async () => {
  const store = makePromptStore(new LocalFsFileStore(root), readDefault);
  await store.set("select", "CUSTOM {{question}}");
  expect(await store.get("select")).toBe("CUSTOM {{question}}");
  expect(await store.isOverridden("select")).toBe(true);
});

it("reset removes active override and returns to default", async () => {
  const store = makePromptStore(new LocalFsFileStore(root), readDefault);
  await store.set("answer", "CUSTOM");
  await store.reset("answer");
  expect(await store.isOverridden("answer")).toBe(false);
  expect(await store.get("answer")).toContain("DEFAULT ANSWER");
});

it("getDefault always returns the default text", async () => {
  const store = makePromptStore(new LocalFsFileStore(root), readDefault);
  await store.set("select", "CUSTOM");
  expect(await store.getDefault("select")).toContain("DEFAULT SELECT");
});
