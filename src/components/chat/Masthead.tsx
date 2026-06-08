"use client";
import { useEffect, useState } from "react";

function formatToday(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}.`;
}

export function Masthead() {
  // SSR/Client 날짜 불일치 방지: 마운트 후에만 표시
  const [dateLine, setDateLine] = useState<string>("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration 안전: 클라이언트 전용 Date를 마운트 후 1회만 세팅
    setDateLine(formatToday(new Date()));
  }, []);

  return (
    <header style={{ display: "grid", gap: "var(--space-xs)" }}>
      <hr className="hairline" aria-hidden />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span className="eyebrow numeric" suppressHydrationWarning>
          {dateLine || " "}
        </span>
      </div>
    </header>
  );
}
