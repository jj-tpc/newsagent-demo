"use client";
import { useEffect, useRef } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      // 위험 액션은 디폴트 포커스를 취소 버튼에. 그 외는 확인.
      requestAnimationFrame(() => {
        if (variant === "danger") {
          (dlg.querySelector('[data-cancel="true"]') as HTMLButtonElement | null)?.focus();
        } else {
          confirmBtnRef.current?.focus();
        }
      });
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open, variant]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      onClick={(e) => {
        // backdrop 클릭으로 닫기
        if (e.target === ref.current) onCancel();
      }}
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 0,
        background: "var(--surface)",
        color: "var(--text)",
        maxWidth: "min(440px, 92vw)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div style={{ padding: "var(--space-lg)", display: "grid", gap: "var(--space-sm)" }}>
        <h2 id="confirm-title" style={{ fontSize: "var(--text-xl)", margin: 0 }}>
          {title}
        </h2>
        {body && (
          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.65 }}>
            {body}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-xs)",
          justifyContent: "flex-end",
          padding: "var(--space-sm) var(--space-lg) var(--space-lg)",
          borderTop: "1px solid var(--border)",
          background: "var(--surface-2)",
          paddingTop: "var(--space-md)",
        }}
      >
        <button
          type="button"
          data-cancel="true"
          className="btn"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          type="button"
          className={variant === "danger" ? "btn btn--danger-solid" : "btn btn--primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
