"use client";
import { useEffect, useState } from "react";

// 답변 생성 동안 보여주는 편집국 톤 안내. 클리셰("Herding pixels") 금지.
const PHASES = [
  "오늘 모은 기사를 살펴보는 중…",
  "관련 기사를 골라내는 중…",
  "본문을 정리하는 중…",
  "답변을 다듬는 중…",
];

const ROTATE_MS = 1800;

export function LoadingNote() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % PHASES.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="enter-up"
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-xs)",
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        paddingTop: "var(--space-xs)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--accent)",
          flexShrink: 0,
          marginRight: 2,
          opacity: 0.85,
          animation: "loading-pulse 1.4s ease-in-out infinite",
        }}
      />
      <span
        key={idx}
        className="enter-up"
        style={{ display: "inline-block" }}
      >
        {PHASES[idx]}
      </span>
      <style>{`
        @keyframes loading-pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50%      { transform: scale(1);   opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
