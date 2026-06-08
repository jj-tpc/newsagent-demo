"use client";
import { useId, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { TagEditor } from "./TagEditor";

const empty: Article = { id: "", title: "", content: "", images: [], publishedDate: "", tags: [] };

const ID_RE = /^\d{4}-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type FieldErrors = Partial<Record<"id" | "title" | "publishedDate" | "content", string>>;

function validate(a: Article, isEdit: boolean): FieldErrors {
  const errs: FieldErrors = {};
  if (!isEdit && !ID_RE.test(a.id)) {
    errs.id = "형식: YYYY-NNNN (예: 2026-0001)";
  }
  if (!a.title.trim()) {
    errs.title = "제목을 입력하세요";
  }
  if (!DATE_RE.test(a.publishedDate)) {
    errs.publishedDate = "형식: YYYY-MM-DD (예: 2026-06-08)";
  } else {
    const d = new Date(a.publishedDate);
    if (Number.isNaN(d.getTime())) errs.publishedDate = "유효하지 않은 날짜입니다";
  }
  if (a.content.trim().length < 10) {
    errs.content = "본문은 10자 이상 입력하세요";
  }
  return errs;
}

export function ArticleEditor({ initial, onSaved }: { initial?: Article; onSaved: () => void }) {
  const [a, setA] = useState<Article>(initial ?? empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(initial);
  const articleIdInputId = useId();
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
    const errs = validate(a, isEdit);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/articles/${a.id}` : "/api/articles";
      await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(a),
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-md)", maxWidth: 720 }}>
      <Field label="ID" htmlFor={articleIdInputId} hint="예: 2026-0001 (YYYY-NNNN)" error={errors.id}>
        <input
          id={articleIdInputId}
          value={a.id}
          disabled={isEdit}
          onChange={(e) => setA({ ...a, id: e.target.value })}
          aria-invalid={errors.id ? true : undefined}
          aria-describedby={errors.id ? `${articleIdInputId}-err` : undefined}
          pattern="\d{4}-\d{4}"
        />
      </Field>
      <Field label="제목" htmlFor={titleId} error={errors.title}>
        <input
          id={titleId}
          value={a.title}
          onChange={(e) => setA({ ...a, title: e.target.value })}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${titleId}-err` : undefined}
        />
      </Field>
      <Field label="발행일" htmlFor={dateId} hint="YYYY-MM-DD" error={errors.publishedDate}>
        <input
          id={dateId}
          type="date"
          value={a.publishedDate}
          onChange={(e) => setA({ ...a, publishedDate: e.target.value })}
          aria-invalid={errors.publishedDate ? true : undefined}
          aria-describedby={errors.publishedDate ? `${dateId}-err` : undefined}
        />
      </Field>
      <Field label="본문" htmlFor={bodyId} error={errors.content}>
        <textarea
          id={bodyId}
          rows={10}
          value={a.content}
          onChange={(e) => setA({ ...a, content: e.target.value })}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? `${bodyId}-err` : undefined}
        />
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
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={submitting}
        >
          {submitting ? "저장 중…" : (isEdit ? "수정 저장" : "추가")}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--text-muted)",
};

const hintStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
};

const errorStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--danger)",
};

function Field({
  label, htmlFor, children, hint, error,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
      <label htmlFor={htmlFor} style={labelStyle}>{label}</label>
      {children}
      {error ? (
        <span id={`${htmlFor}-err`} role="alert" style={errorStyle}>{error}</span>
      ) : hint ? (
        <span style={hintStyle}>{hint}</span>
      ) : null}
    </div>
  );
}
