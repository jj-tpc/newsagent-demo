import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeStore } from "./store";

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

it("creates and reads an article", async () => {
  const store = makeStore(dir);
  await store.create({
    id: "a1", title: "T", content: "C", images: [],
    publishedDate: "2026-06-01", tags: ["x", "y"],
  });
  const got = await store.get("a1");
  expect(got?.title).toBe("T");
  const all = await store.list();
  expect(all.map((a) => a.id)).toEqual(["a1"]);
});

it("updates and deletes an article", async () => {
  const store = makeStore(dir);
  await store.create({ id: "a1", title: "T", content: "C", images: [], publishedDate: "2026-06-01", tags: [] });
  await store.update("a1", { title: "T2" });
  expect((await store.get("a1"))?.title).toBe("T2");
  await store.remove("a1");
  expect(await store.get("a1")).toBeNull();
});
