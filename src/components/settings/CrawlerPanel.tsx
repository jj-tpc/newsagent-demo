"use client";
import { useEffect, useId, useRef, useState } from "react";

export function CrawlerPanel() {
  const [keyword, setKeyword] = useState("홍명보");
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const kwId = useId();
  const cntId = useId();

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => () => esRef.current?.close(), []);

  function run() {
    if (running) return;
    const k = keyword.trim();
    if (!k) {
      setLogs(["키워드를 입력하세요."]);
      return;
    }
    setLogs([]);
    setRunning(true);
    const url = `/api/crawl?keyword=${encodeURIComponent(k)}&count=${count}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => setLogs((l) => [...l, e.data]);
    es.addEventListener("done", (e) => {
      try {
        const { exitCode } = JSON.parse((e as MessageEvent).data);
        setLogs((l) => [...l, `\n[종료: exit ${exitCode}]`]);
      } catch {
        setLogs((l) => [...l, "\n[종료]"]);
      }
      setRunning(false);
      es.close();
      esRef.current = null;
    });
    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) return;
      setLogs((l) => [...l, "\n[연결 종료 또는 서버 오류]"]);
      setRunning(false);
      es.close();
      esRef.current = null;
    });
  }

  return (
    <section style={{ display: "grid", gap: "var(--space-md)" }}>
      <h2>뉴스 크롤링</h2>
      <div
        style={{
          display: "grid",
          gap: "var(--space-sm)",
          gridTemplateColumns: "minmax(0, 1fr) 100px auto",
          alignItems: "end",
        }}
      >
        <div style={{ display: "grid", gap: "var(--space-2xs)", minWidth: 0 }}>
          <label htmlFor={kwId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            키워드
          </label>
          <input
            id={kwId}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={running}
            maxLength={50}
          />
        </div>
        <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
          <label htmlFor={cntId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            개수
          </label>
          <input
            id={cntId}
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            disabled={running}
            min={1}
            max={20}
          />
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={run}
          disabled={running}
        >
          {running ? "실행 중…" : "크롤링 실행"}
        </button>
      </div>
      <pre
        ref={logRef}
        aria-live="polite"
        aria-label="크롤링 로그"
        style={{
          margin: 0,
          padding: "var(--space-sm) var(--space-md)",
          height: 280,
          overflow: "auto",
          background: "var(--surface-code)",
          color: "var(--text-on-code)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-xs)",
          lineHeight: 1.55,
          fontFamily: "var(--font-mono)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {logs.length === 0 ? "실행 결과가 여기에 표시됩니다." : logs.join("\n")}
      </pre>
    </section>
  );
}
