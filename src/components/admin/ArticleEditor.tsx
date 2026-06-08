"use client";
import { useId, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { TagEditor } from "./TagEditor";

const empty: Article = { id: "", title: "", content: "", images: [], publishedDate: "", tags: [] };

export function ArticleEditor({ initial, onSaved }: { initial?: Article; onSaved: () => void }) {
  const [a, setA] = useState<Article>(initial ?? empty);
  const isEdit = Boolean(initial);
  const idIdId = useId();
  const titleId = useId();
  const dateId = useId();
  const bodyId = useId();
  const uploadId = useId();

  async function uploadImage(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { filename } = await res.json();
    setA((s) => ({ ...s, images: [...s.images, { filename, caption: "" }] }));
  }
  async function save() {
    const url = isEdit ? `/api/articles/${a.id}` : "/api/articles";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(a),
    });
    onSaved();
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-md)", maxWidth: 720 }}>
      <Field label="ID (예: 2026-0001)" htmlFor={idIdId}>
        <input id={idIdId} value={a.id} disabled={isEdit}
          onChange={(e) => setA({ ...a, id: e.target.value })} />
      </Field>
      <Field label="제목" htmlFor={titleId}>
        <input id={titleId} value={a.title}
          onChange={(e) => setA({ ...a, title: e.target.value })} />
      </Field>
      <Field label="발행일 (YYYY-MM-DD)" htmlFor={dateId}>
        <input id={dateId} value={a.publishedDate}
          onChange={(e) => setA({ ...a, publishedDate: e.target.value })} />
      </Field>
      <Field label="본문" htmlFor={bodyId}>
        <textarea id={bodyId} rows={10} value={a.content}
          onChange={(e) => setA({ ...a, content: e.target.value })} />
      </Field>

      <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <span style={labelStyle}>태그</span>
        <TagEditor tags={a.tags} onChange={(tags) => setA({ ...a, tags })} />
      </div>

      <Field label="이미지 업로드" htmlFor={uploadId}>
        <input id={uploadId} type="file" accept="image/*"
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
      </Field>

      {a.images.length > 0 && (
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          <span style={labelStyle}>등록된 이미지</span>
          {a.images.map((img, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "var(--space-sm)",
                alignItems: "center",
                padding: "var(--space-xs)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/images/${img.filename}`} alt={img.caption || img.filename}
                style={{ width: 72, height: 48, objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
              <input placeholder="캡션" value={img.caption}
                aria-label={`${img.filename} 캡션`}
                onChange={(e) => setA({
                  ...a, images: a.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x),
                })} />
              <button type="button" className="btn btn--sm btn--danger"
                aria-label={`${img.filename} 삭제`}
                onClick={() => setA({ ...a, images: a.images.filter((_, j) => j !== i) })}>
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <button type="button" className="btn btn--primary" onClick={save}>
          {isEdit ? "수정 저장" : "추가"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--text-muted)",
};

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
      <label htmlFor={htmlFor} style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
