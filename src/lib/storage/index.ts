import { LocalFsFileStore } from "./local-fs-store";
import { VercelBlobFileStore } from "./vercel-blob-store";
import type { FileStore } from "./file-store";

export type { FileStore } from "./file-store";

/**
 * Vercel Blob 을 쓸지 판정.
 *  1) BLOB_READ_WRITE_TOKEN 있음 → Blob (명시적 read-write 토큰)
 *  2) Vercel 런타임 + BLOB_STORE_ID 있음 → Blob (managed/OIDC)
 *     이 프로젝트는 Blob store 가 managed 로 연결돼서 Vercel 이 BLOB_STORE_ID 와
 *     VERCEL_OIDC_TOKEN 만 주입하고 BLOB_READ_WRITE_TOKEN 은 주지 않는다.
 *     @vercel/blob SDK 는 (storeId + oidcToken) 조합으로 자동 인증하므로
 *     명시적 토큰 없이도 read/write 가 동작한다.
 *  3) 그 외 → 로컬 디스크
 *
 * (2) 를 빠뜨리면 Vercel 에서 LocalFsFileStore 로 떨어져 /var/task 에 쓰다가 EROFS.
 */
export function shouldUseBlob(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL && process.env.BLOB_STORE_ID) return true;
  return false;
}

let cached: FileStore | null = null;

export function getFileStore(): FileStore {
  if (cached) return cached;
  cached = shouldUseBlob()
    ? new VercelBlobFileStore()
    : new LocalFsFileStore(process.cwd());
  return cached;
}

/** 테스트에서 다른 구현체로 주입할 때 사용. */
export function setFileStore(store: FileStore): void {
  cached = store;
}
