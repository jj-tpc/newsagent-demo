import { LocalFsFileStore } from "./local-fs-store";
import type { FileStore } from "./file-store";

export type { FileStore } from "./file-store";

/**
 * 런타임 분기:
 *  - BLOB_READ_WRITE_TOKEN 있음 → Vercel Blob (Phase 2에서 추가)
 *  - 없음 → 로컬 디스크
 */
let cached: FileStore | null = null;

export function getFileStore(): FileStore {
  if (cached) return cached;
  // Phase 1: LocalFs 전용. Phase 2에서 BLOB 분기 추가.
  cached = new LocalFsFileStore(process.cwd());
  return cached;
}

/** 테스트에서 다른 구현체로 주입할 때 사용. */
export function setFileStore(store: FileStore): void {
  cached = store;
}
