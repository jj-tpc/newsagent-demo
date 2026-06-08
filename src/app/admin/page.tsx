"use client";
import { useCallback, useEffect, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { ArticleTable } from "@/components/admin/ArticleTable";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/articles").then((r) => r.json()).then(setArticles);
  }, []);

  useEffect(() => {
    fetch("/api/articles").then((r) => r.json()).then(setArticles);
  }, []);

  async function remove(id: string) {
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
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
      <header>
        <h1>기사 관리</h1>
      </header>

      {!editing && !creating && (
        <>
          <div>
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              + 새 기사
            </button>
          </div>
          <ArticleTable articles={articles} onEdit={setEditing} onDelete={remove} />
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
    </div>
  );
}
