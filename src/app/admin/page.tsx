"use client";
import { useEffect, useState } from "react";
import type { Article } from "@/lib/articles/types";
import { ArticleTable } from "@/components/admin/ArticleTable";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  async function load() { setArticles(await (await fetch("/api/articles")).json()); }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    load();
  }
  function afterSave() { setEditing(undefined); setCreating(false); load(); }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>기사 관리</h2>
      {!editing && !creating && (
        <>
          <button onClick={() => setCreating(true)}>+ 새 기사</button>
          <ArticleTable articles={articles} onEdit={setEditing} onDelete={remove} />
        </>
      )}
      {(editing || creating) && (
        <>
          <button onClick={() => { setEditing(undefined); setCreating(false); }}>← 목록</button>
          <ArticleEditor initial={editing} onSaved={afterSave} />
        </>
      )}
    </div>
  );
}
