"use client";
import { useState } from "react";
import type { Article } from "@/lib/articles/types";
import { TagEditor } from "./TagEditor";

const empty: Article = { id: "", title: "", content: "", images: [], publishedDate: "", tags: [] };

export function ArticleEditor({ initial, onSaved }: { initial?: Article; onSaved: () => void }) {
  const [a, setA] = useState<Article>(initial ?? empty);
  const isEdit = Boolean(initial);

  async function uploadImage(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { filename } = await res.json();
    setA((s) => ({ ...s, images: [...s.images, { filename, caption: "" }] }));
  }
  async function save() {
    const url = isEdit ? `/api/articles/${a.id}` : "/api/articles";
    await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
    onSaved();
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
      <input placeholder="id" value={a.id} disabled={isEdit} onChange={(e) => setA({ ...a, id: e.target.value })} />
      <input placeholder="제목" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
      <input placeholder="발행일 YYYY-MM-DD" value={a.publishedDate} onChange={(e) => setA({ ...a, publishedDate: e.target.value })} />
      <textarea placeholder="본문" rows={8} value={a.content} onChange={(e) => setA({ ...a, content: e.target.value })} />
      <TagEditor tags={a.tags} onChange={(tags) => setA({ ...a, tags })} />
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
      {a.images.map((img, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/images/${img.filename}`} alt="" style={{ width: 64 }} />
          <input placeholder="캡션" value={img.caption}
            onChange={(e) => setA({ ...a, images: a.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x) })} />
          <button onClick={() => setA({ ...a, images: a.images.filter((_, j) => j !== i) })}>삭제</button>
        </div>
      ))}
      <button onClick={save}>{isEdit ? "수정 저장" : "추가"}</button>
    </div>
  );
}
