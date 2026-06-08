"use client";
import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatToday(now: Date): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = WEEKDAYS[now.getDay()];
  return `${y}년 ${m}월 ${d}일 ${w}요일`;
}

export function Masthead() {
  // SSR/Client 날짜 불일치 방지: 마운트 후에만 표시
  const [dateLine, setDateLine] = useState<string>("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration 안전: 클라이언트 전용 Date를 마운트 후 1회만 세팅
    setDateLine(formatToday(new Date()));
  }, []);

  return (
    <header style={{ display: "grid", gap: "var(--space-sm)" }}>
      <hr className="hairline" />
      <div
        className="eyebrow"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <span>제 1면</span>
        <span className="numeric" suppressHydrationWarning>{dateLine || " "}</span>
      </div>
      <h1 className="masthead">신문 에이전트</h1>
      <p style={{
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        margin: 0,
        maxWidth: "55ch",
      }}>
        오늘 모은 기사에서 답을 찾아 드립니다.
      </p>
      <hr className="hairline--double" style={{ marginTop: "var(--space-xs)" }} />
    </header>
  );
}
