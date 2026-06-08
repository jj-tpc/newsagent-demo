import fs from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "./file-store";

/**
 * 로컬 디스크 기반 FileStore.
 * 키 "articles/2026-0001.json" → <root>/data/articles/2026-0001.json
 * 키 "articles/images/x.jpg"   → <root>/data/articles/images/x.jpg
 * 키 "config/settings.json"    → <root>/data/config/settings.json
 * 키 "prompts/select.md"       → <root>/data/prompts/select.md
 *
 * publicUrl: 이미지 prefix(articles/images/)는 기존 /api/images/<basename>
 *            라우트로 매핑하여 호환성 유지.
 */
export class LocalFsFileStore implements FileStore {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (key.startsWith("/") || key.includes("..")) {
      throw new Error(`invalid key: ${key}`);
    }
    return path.join(this.root, "data", ...key.split("/"));
  }

  async readText(key: string): Promise<string | null> {
    try { return await fs.readFile(this.resolve(key), "utf8"); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async readBuffer(key: string): Promise<ArrayBuffer | null> {
    try {
      const buf = await fs.readFile(this.resolve(key));
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async write(
    key: string,
    data: string | ArrayBuffer | Uint8Array,
    // contentType은 Blob 백엔드만 필요. 디스크에는 확장자로 충분
    _contentType: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (typeof data === "string") {
      await fs.writeFile(target, data, "utf8");
    } else if (data instanceof Uint8Array) {
      await fs.writeFile(target, data);
    } else {
      await fs.writeFile(target, new Uint8Array(data));
    }
  }

  async delete(key: string): Promise<void> {
    try { await fs.unlink(this.resolve(key)); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const base = path.join(this.root, "data");
    const out: string[] = [];
    async function walk(dir: string, rel: string) {
      let entries: import("node:fs").Dirent[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const e of entries) {
        const next = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) {
          await walk(path.join(dir, e.name), next);
        } else if (e.isFile() && next.startsWith(prefix)) {
          out.push(next);
        }
      }
    }
    await walk(base, "");
    return out.sort();
  }

  async externalUrl(_key: string): Promise<string | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null; // LocalFs는 외부 URL이 없음 — 호출자가 readBuffer로 stream
  }
}
