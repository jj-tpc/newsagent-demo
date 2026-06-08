// 데이터 영속 계층 추상화.
// 로컬: data/ 디렉토리 직접 read/write.
// Vercel: @vercel/blob 의 put/list/del 로 같은 키 모양 사용.
//
// 키는 항상 forward-slash 경로 (예: "articles/2026-0001.json",
// "articles/images/2026-0001_0.jpg", "config/settings.json").

export interface FileStore {
  readText(key: string): Promise<string | null>;
  readBuffer(key: string): Promise<ArrayBuffer | null>;
  write(
    key: string,
    data: string | ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<void>;
  delete(key: string): Promise<void>;
  /** prefix 로 시작하는 모든 키 (재귀). 빈 prefix 면 전체 root 스캔. */
  list(prefix: string): Promise<string[]>;
  /**
   * 브라우저가 직접 다운로드할 수 있는 외부 URL.
   * - LocalFs: null (이 경우 호출자가 readBuffer로 스트리밍)
   * - VercelBlob: Blob CDN의 public URL (호출자가 302 redirect 가능)
   */
  externalUrl(key: string): Promise<string | null>;
}
