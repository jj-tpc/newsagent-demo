import { LocalFsFileStore } from "./local-fs-store";
import { VercelBlobFileStore } from "./vercel-blob-store";
import type { FileStore } from "./file-store";

export type { FileStore } from "./file-store";

/**
 * 런타임 분기:
 *  - BLOB_READ_WRITE_TOKEN 있음 → Vercel Blob (로컬·자체호스팅에서 명시적으로)
 *  - Vercel 환경 + BLOB_STORE_ID 있음 → Vercel Blob (managed project / OIDC)
 *  - 그 외 → 로컬 디스크
 */
let cached: FileStore | null = null;

export function shouldUseBlob(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL && process.env.BLOB_STORE_ID) return true;
  return false;
}

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
