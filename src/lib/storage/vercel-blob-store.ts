import { put, del, list, head, BlobNotFoundError } from "@vercel/blob";
import type { FileStore } from "./file-store";

/**
 * Vercel Blob 기반 FileStore.
 *
 * 키 → blob pathname 매핑은 1:1. 예: "articles/2026-0001.json" 그대로.
 * Blob은 기본 public access — `addRandomSuffix: false` + `allowOverwrite: true`로
 * 우리 키 그대로 사용해서 idempotent 한 read/write 보장.
 *
 * publicUrl: Blob의 public URL을 그대로 반환.
 *   /api/images 라우트는 이 URL로 302 redirect 해서 Blob CDN 직결.
 */
export class VercelBlobFileStore implements FileStore {
  // BLOB_READ_WRITE_TOKEN 은 @vercel/blob SDK 가 자동으로 process.env에서 읽음

  async readText(key: string): Promise<string | null> {
    try {
      const meta = await head(key);
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      if (isBlobNotFound(e)) return null;
      throw e;
    }
  }

  async readBuffer(key: string): Promise<ArrayBuffer | null> {
    try {
      const meta = await head(key);
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch (e) {
      if (isBlobNotFound(e)) return null;
      throw e;
    }
  }

  async write(
    key: string,
    data: string | ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<void> {
    // @vercel/blob의 put()은 PutBody(=Readable|Buffer|Blob|ReadableStream|File)만 받음.
    // string은 그대로, 바이너리는 Node Buffer로 변환.
    let body: string | Buffer;
    if (typeof data === "string") body = data;
    else if (data instanceof Uint8Array) body = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    else body = Buffer.from(data);
    await put(key, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      cacheControlMaxAge: 60,
    });
  }

  async delete(key: string): Promise<void> {
    try { await del(key); }
    catch (e) {
      if (isBlobNotFound(e)) return;
      throw e;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) out.push(b.pathname);
      cursor = page.cursor;
    } while (cursor);
    return out.sort();
  }

  async externalUrl(key: string): Promise<string | null> {
    // Blob의 public URL은 임의 suffix(addRandomSuffix:false 라도 store별)이라
    // head() 한 번 호출이 필요. 결과는 라우트가 302 redirect 에 그대로 쓴다.
    try {
      const meta = await head(key);
      return meta.url;
    } catch (e) {
      if (isBlobNotFound(e)) return null;
      throw e;
    }
  }
}

function isBlobNotFound(e: unknown): boolean {
  // 1차: instanceof — 프로토타입 체인 기반이라 프로덕션 minify 에도 안전하다.
  //   (@vercel/blob 의 BlobError 계열은 this.name 을 세팅하지 않아서 e.name 은 항상 "Error".
  //    constructor.name 도 번들 minify 로 mangle 되므로 둘 다 신뢰할 수 없다.)
  if (e instanceof BlobNotFoundError) return true;
  // 2차 fallback: 메시지 매칭. 모듈 인스턴스 중복 등으로 instanceof 가 빗나갈 경우 대비.
  //   실제 메시지: "Vercel Blob: The requested blob does not exist".
  if (e && typeof e === "object") {
    const msg = (e as { message?: string }).message ?? "";
    if (/blob/i.test(msg) && /(not found|does not exist)/i.test(msg)) return true;
  }
  return false;
}
