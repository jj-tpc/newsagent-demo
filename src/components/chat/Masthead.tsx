"use client";
import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatToday(now: Date): { full: string; short: string } {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = WEEKDAYS[now.getDay()];
  return {
    full: `${y}년 ${m}월 ${d}일 ${w}요일`,
    short: `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}.`,
  };
}

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
};

export function Masthead() {
  // SSR/Client 날짜 불일치 방지: 마운트 후에만 표시
  const [date, setDate] = useState<{ full: string; short: string }>({ full: "", short: "" });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration 안전: 클라이언트 전용 Date를 마운트 후 1회만 세팅
    setDate(formatToday(new Date()));
  }, []);

  return (
    <header style={{ display: "grid", gap: "var(--space-sm)" }}>
      {/* 페이지 시맨틱 H1 — 시각적으로 감춤, 스크린리더와 SEO 용 */}
      <h1 style={SR_ONLY}>신문 에이전트</h1>

      <hr className="hairline" aria-hidden />
      <div
        className="eyebrow"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <span>제 1면</span>
        <span className="numeric" suppressHydrationWarning>{date.short || " "}</span>
      </div>
      <p
        className="masthead numeric"
        suppressHydrationWarning
        style={{ margin: 0 }}
      >
        {date.full || " "}
      </p>
      <p style={{
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        margin: 0,
        maxWidth: "55ch",
      }}>
        오늘 모은 기사에서 답을 찾아 드립니다.
      </p>
      <hr className="hairline--double" aria-hidden style={{ marginTop: "var(--space-xs)" }} />
    </header>
  );
}
