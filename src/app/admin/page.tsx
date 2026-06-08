"use client";
import { useCallback, useEffect, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { ArticleTable } from "@/components/admin/ArticleTable";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const load = useCallback(() => {
    fetch("/api/articles").then((r) => r.json()).then(setArticles);
  }, []);

  useEffect(() => {
    fetch("/api/articles").then((r) => r.json()).then(setArticles);
  }, []);

  function askDelete(id: string) {
    const target = articles.find((a) => a.id === id);
    if (target) setPendingDelete(target);
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    await fetch(`/api/articles/${target.id}`, { method: "DELETE" });
    load();
  }

  function afterSave() { setEditing(undefined); setCreating(false); load(); }

  return (
    <div
      style={{
        maxWidth: "var(--content-wide)",
        margin: "0 auto",
        padding: "var(--space-lg) var(--space-md)",
        display: "grid",
        gap: "var(--space-lg)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <span className="eyebrow">편집국</span>
        <h1 style={{ margin: 0 }}>기사 관리</h1>
        <hr className="hairline" style={{ marginTop: "var(--space-xs)" }} />
      </header>

      {!editing && !creating && (
        <>
          <div>
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + 새 기사
            </button>
          </div>
          <ArticleTable articles={articles} onEdit={setEditing} onDelete={askDelete} />
        </>
      )}
      {(editing || creating) && (
        <>
          <div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setEditing(undefined); setCreating(false); }}
            >
              ← 목록으로
            </button>
          </div>
          <ArticleEditor initial={editing} onSaved={afterSave} />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        variant="danger"
        title="기사 삭제"
        body={
          <>
            <span className="emph" style={{ color: "var(--text-strong)" }}>
              「{pendingDelete?.title}」
            </span>
            을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
