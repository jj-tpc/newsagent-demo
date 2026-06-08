"use client";
import { useEffect, useRef, useState } from "react";

export function CrawlerPanel() {
  const [keyword, setKeyword] = useState("홍명보");
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);
  const esRef = useRef<EventSource | null>(null);

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
    <section style={{ display: "grid", gap: 8 }}>
      <h3>뉴스 크롤링</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          키워드{" "}
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={running}
            maxLength={50}
            style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6, minWidth: 200 }}
          />
        </label>
        <label>
          개수{" "}
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            disabled={running}
            min={1}
            max={20}
            style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6, width: 64 }}
          />
        </label>
        <button
          onClick={run}
          disabled={running}
          style={{
            padding: "6px 14px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: running ? "#f3f4f6" : "#fff",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "실행 중…" : "크롤링 실행"}
        </button>
      </div>
      <pre
        ref={logRef}
        style={{
          margin: 0,
          padding: 10,
          height: 260,
          overflow: "auto",
          background: "#0f172a",
          color: "#e2e8f0",
          border: "1px solid #334155",
          borderRadius: 6,
          fontSize: 12,
          lineHeight: 1.5,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {logs.length === 0 ? "실행 결과가 여기에 표시됩니다." : logs.join("\n")}
      </pre>
    </section>
  );
}
