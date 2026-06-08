import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeStore } from "./store";
import { LocalFsFileStore } from "../storage/local-fs-store";

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "store-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

it("creates and reads an article", async () => {
  const store = makeStore(new LocalFsFileStore(root));
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
  const store = makeStore(new LocalFsFileStore(root));
  await store.create({ id: "a1", title: "T", content: "C", images: [], publishedDate: "2026-06-01", tags: [] });
  await store.update("a1", { title: "T2" });
  expect((await store.get("a1"))?.title).toBe("T2");
  await store.remove("a1");
  expect(await store.get("a1")).toBeNull();
});

it("list ignores image files under articles/images/", async () => {
  const store = new LocalFsFileStore(root);
  // 가짜 이미지 파일을 같은 prefix 아래에 둠
  await store.write("articles/images/x.jpg", new Uint8Array([1, 2, 3]), "image/jpeg");
  const articles = makeStore(store);
  await articles.create({
    id: "a1", title: "T", content: "C", images: [{ filename: "x.jpg", caption: "c" }],
    publishedDate: "2026-06-01", tags: [],
  });
  const all = await articles.list();
  expect(all.map((a) => a.id)).toEqual(["a1"]);
});
