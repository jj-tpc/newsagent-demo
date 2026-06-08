"use client";
import { useRef, useState } from "react";

type Status = "queued" | "uploading" | "done" | "failed";
type Item = { name: string; size: number; status: Status; error?: string };

export function UploadPanel({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() { inputRef.current?.click(); }

  function reset() {
    setItems([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const queued: Item[] = files.map((f) => ({ name: f.name, size: f.size, status: "queued" }));
    setItems(queued);
    setUploading(true);

    for (let i = 0; i < files.length; i += 1) {
      setItems((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "uploading" };
        return next;
      });
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        const res = await fetch("/api/articles/upload", { method: "POST", body: fd });
        if (!res.ok) {
          // 응답 body 를 한 번 text로 받아서 — JSON이면 error 필드, 아니면 그대로
          const raw = await res.text();
          let detail = raw.slice(0, 200);
          try {
            const json = JSON.parse(raw) as { error?: string; hint?: string };
            if (typeof json?.error === "string") {
              detail = json.error + (json.hint ? ` (${json.hint})` : "");
            }
          } catch { /* HTML 에러페이지나 빈 본문 — raw 그대로 사용 */ }
          throw new Error(`HTTP ${res.status} — ${detail || "(빈 응답)"}`);
        }
        setItems((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: "done" };
          return next;
        });
      } catch (err) {
        setItems((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: "failed", error: (err as Error).message };
          return next;
        });
      }
    }

    setUploading(false);
    onDone();
  }

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const total = items.length;

  return (
    <section
      aria-label="기사 데이터 업로드"
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        padding: "var(--space-md)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-2)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>
          데이터 업로드
        </strong>
        <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          JSON 기사 파일과 이미지 파일을 선택해 한 번에 올립니다.
        </span>
      </div>

      <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={pick} disabled={uploading}>
          {uploading ? "업로드 중…" : "파일 선택"}
        </button>
        {items.length > 0 && !uploading && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
            목록 비우기
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,.jpg,.jpeg,.png,.webp,.gif,application/json,image/*"
          onChange={onFiles}
          style={{ display: "none" }}
        />
      </div>

      {items.length > 0 && (
        <div aria-live="polite">
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-sm)",
            color: "var(--text-strong)",
            marginBottom: "var(--space-xs)",
          }}>
            진행 · {done + failed}/{total}
            {failed > 0 && (
              <span style={{ color: "var(--danger)", marginLeft: "var(--space-xs)" }}>
                실패 {failed}
              </span>
            )}
          </div>
          <ul style={{
            listStyle: "none", margin: 0, padding: 0,
            display: "grid", gap: "var(--space-2xs)",
            maxHeight: 220, overflow: "auto",
          }}>
            {items.map((it, i) => <Row key={i} item={it} />)}
          </ul>
        </div>
      )}
    </section>
  );
}

const MARK: Record<Status, string> = {
  queued: "·",
  uploading: "⋯",
  done: "✓",
  failed: "✕",
};
const STATUS_LABEL: Record<Status, string> = {
  queued: "대기",
  uploading: "업로드 중",
  done: "완료",
  failed: "실패",
};

function Row({ item }: { item: Item }) {
  const color =
    item.status === "done" ? "var(--success)" :
    item.status === "failed" ? "var(--danger)" :
    "var(--text-muted)";
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "var(--space-sm)",
        alignItems: "baseline",
        fontSize: "var(--text-sm)",
      }}
    >
      <span aria-hidden style={{ color, width: "1em", textAlign: "center" }}>{MARK[item.status]}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.name}
        {item.status === "failed" && item.error && (
          <span style={{ color: "var(--danger)", marginLeft: "var(--space-xs)", fontSize: "var(--text-xs)" }}>
            — {item.error}
          </span>
        )}
      </span>
      <span className="eyebrow" style={{ color, fontSize: "var(--text-xs)" }}>
        {STATUS_LABEL[item.status]}
      </span>
    </li>
  );
}
