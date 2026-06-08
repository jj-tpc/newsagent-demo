"use client";
import { useEffect, useRef } from "react";

export type LightboxImage = { src: string; caption: string };

/**
 * 답변 본문 이미지를 클릭했을 때 뜨는 확대 보기.
 * <dialog> showModal()로 native modal — Escape 자동 처리, 백드롭 클릭은 별도 가드.
 */
export function ImageLightbox({
  image, onClose,
}: {
  image: LightboxImage | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (image && !dlg.open) {
      dlg.showModal();
    } else if (!image && dlg.open) {
      dlg.close();
    }
  }, [image]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="이미지 확대 보기"
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        color: "var(--text-on-accent)",
        maxWidth: "96vw",
        maxHeight: "96vh",
        width: "auto",
        height: "auto",
        overflow: "visible",
      }}
    >
      {image && (
        <figure
          style={{
            margin: 0,
            display: "grid",
            gap: "var(--space-sm)",
            justifyItems: "center",
            maxWidth: "min(96vw, 1100px)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.caption}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "82vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              background: "var(--surface-sunken)",
            }}
          />
          {image.caption && (
            <figcaption
              style={{
                fontSize: "var(--text-sm)",
                lineHeight: 1.55,
                maxWidth: "70ch",
                textAlign: "center",
                color: "oklch(0.96 0.005 60)",
                background: "oklch(0.15 0.010 60 / 0.85)",
                padding: "var(--space-xs) var(--space-md)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {image.caption}
            </figcaption>
          )}
        </figure>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="확대 보기 닫기"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          minWidth: 44,
          minHeight: 44,
          padding: 0,
          border: "none",
          borderRadius: "var(--radius-pill)",
          background: "oklch(0.15 0.01 60 / 0.85)",
          color: "oklch(0.96 0.005 60)",
          fontSize: 20,
          lineHeight: 1,
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        ×
      </button>
    </dialog>
  );
}
