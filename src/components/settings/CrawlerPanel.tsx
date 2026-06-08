"use client";
import { useEffect, useId, useRef, useState } from "react";

type ItemStatus = "running" | "done" | "failed" | "skipped";
type Item = { url: string; status: ItemStatus; savedAs?: string; imageCount?: number };
type Phase = "idle" | "searching" | "processing" | "done";

export function CrawlerPanel() {
  const [keyword, setKeyword] = useState("홍명보");
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<Item[]>([]);
  const [totalExpected, setTotalExpected] = useState<number>(0);
  const [resultLine, setResultLine] = useState<string>("");
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

  function reset() {
    setPhase("idle");
    setItems([]);
    setTotalExpected(0);
    setResultLine("");
    setLogs([]);
  }

  function ingest(line: string) {
    setLogs((l) => [...l, line]);

    const found = line.match(/\[search\] found (\d+) naver-hosted/);
    if (found) {
      setPhase("processing");
      setTotalExpected(Number(found[1]));
      return;
    }
    const skipM = line.match(/\[skip\] 이미 저장됨: (\S+)/);
    if (skipM) {
      setItems((prev) => [...prev, { url: skipM[1], status: "skipped" }]);
      return;
    }
    const fetchM = line.match(/\[article\] GET (\S+)/);
    if (fetchM) {
      const url = fetchM[1];
      setItems((prev) => [...prev, { url, status: "running" }]);
      return;
    }
    const saveM = line.match(/\[save\] (\S+\.json)\s+\(images: (\d+)/);
    if (saveM) {
      const filename = saveM[1].split(/[\\/]/).pop() ?? saveM[1];
      const imageCount = Number(saveM[2]);
      setItems((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].status === "running") {
            next[i] = { ...next[i], status: "done", savedAs: filename, imageCount };
            return next;
          }
        }
        return next;
      });
      return;
    }
    if (line.startsWith("[article] FAILED") || line.startsWith("[llm] FAILED")) {
      setItems((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].status === "running") {
            next[i] = { ...next[i], status: "failed" };
            return next;
          }
        }
        return next;
      });
      return;
    }
    const resultM = line.match(/^완료: 성공/);
    if (resultM) {
      setResultLine(line);
      setPhase("done");
    }
  }

  function run() {
    if (running) return;
    const k = keyword.trim();
    if (!k) return;
    reset();
    setRunning(true);
    setPhase("searching");
    const url = `/api/crawl?keyword=${encodeURIComponent(k)}&count=${count}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => ingest(e.data);
    es.addEventListener("done", (e) => {
      try {
        const { exitCode } = JSON.parse((e as MessageEvent).data);
        setLogs((l) => [...l, `\n[종료: 정상] (exit ${exitCode})`]);
      } catch {
        setLogs((l) => [...l, "\n[종료]"]);
      }
      setRunning(false);
      es.close();
      esRef.current = null;
    });
    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) return;
      setLogs((l) => [...l, "\n[연결이 끊겼습니다]"]);
      setRunning(false);
      setPhase("done");
      es.close();
      esRef.current = null;
    });
  }

  const succeeded = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const skipped = items.filter((i) => i.status === "skipped").length;

  return (
    <section style={{ display: "grid", gap: "var(--space-md)" }}>
      <h2>뉴스 크롤링</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0, maxWidth: "60ch" }}>
        키워드로 네이버 모바일 뉴스 검색 결과 중 네이버 자체 호스팅 기사를 가져와
        본문을 정리하고 태그를 붙여 저장합니다. 가져온 기사는 곧바로
        <a href="/admin" style={{ marginLeft: "0.25em" }}>기사 관리</a> 목록에 추가됩니다.
      </p>

      <div
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          alignItems: "end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "var(--space-2xs)", flex: "2 1 220px", minWidth: 0 }}>
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
        <div style={{ display: "grid", gap: "var(--space-2xs)", flex: "0 0 96px" }}>
          <label htmlFor={cntId} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            가져올 기사 수
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
          disabled={running || !keyword.trim()}
          style={{ flex: "0 0 auto" }}
        >
          {running ? "가져오는 중…" : "기사 가져오기"}
        </button>
      </div>

      {/* 진행 상태 */}
      {phase !== "idle" && (
        <div
          aria-live="polite"
          style={{
            display: "grid",
            gap: "var(--space-sm)",
            padding: "var(--space-md)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-2)",
          }}
        >
          <ProgressHeader
            phase={phase}
            succeeded={succeeded}
            failed={failed}
            skipped={skipped}
            total={totalExpected}
            resultLine={resultLine}
          />
          {items.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2xs)" }}>
              {items.map((it, i) => (
                <ProgressRow key={i} index={i} item={it} />
              ))}
            </ul>
          )}
        </div>
      )}

      <details
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "var(--space-xs) var(--space-md)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            userSelect: "none",
          }}
        >
          상세 로그 보기 ({logs.length}줄)
        </summary>
        <pre
          ref={logRef}
          style={{
            margin: 0,
            padding: "var(--space-sm) var(--space-md)",
            height: 220,
            overflow: "auto",
            background: "var(--surface-code)",
            color: "var(--text-on-code)",
            borderTop: "1px solid var(--border)",
            borderRadius: "0 0 var(--radius-md) var(--radius-md)",
            fontSize: "var(--text-xs)",
            lineHeight: 1.55,
            fontFamily: "var(--font-mono)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {logs.length === 0 ? "아직 실행 기록이 없습니다." : logs.join("\n")}
        </pre>
      </details>
    </section>
  );
}

function ProgressHeader({
  phase, succeeded, failed, skipped, total, resultLine,
}: {
  phase: Phase; succeeded: number; failed: number; skipped: number; total: number; resultLine: string;
}) {
  if (phase === "searching") {
    return <strong style={{ fontFamily: "var(--font-display)" }}>검색 결과를 가져오는 중…</strong>;
  }
  if (phase === "processing") {
    const total_ = total || succeeded + failed + skipped;
    return (
      <strong style={{ fontFamily: "var(--font-display)" }}>
        진행 중 · {succeeded + failed + skipped}/{total_}
        {failed > 0 && (
          <span style={{ color: "var(--danger)", marginLeft: "var(--space-xs)", fontSize: "var(--text-sm)" }}>
            실패 {failed}
          </span>
        )}
      </strong>
    );
  }
  if (phase === "done") {
    return (
      <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
        <strong style={{ fontFamily: "var(--font-display)" }}>
          완료 · 성공 {succeeded}건
          {failed > 0 && ` · 실패 ${failed}건`}
          {skipped > 0 && ` · 중복 ${skipped}건`}
        </strong>
        {resultLine && (
          <span className="numeric" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {resultLine}
          </span>
        )}
      </div>
    );
  }
  return null;
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  running: "가져오는 중",
  done: "저장 완료",
  failed: "실패",
  skipped: "이미 저장됨",
};

function ProgressRow({ index, item }: { index: number; item: Item }) {
  const mark =
    item.status === "done" ? "✓" :
    item.status === "failed" ? "✕" :
    item.status === "skipped" ? "—" :
    "⋯";
  const color =
    item.status === "done" ? "var(--success)" :
    item.status === "failed" ? "var(--danger)" :
    "var(--text-muted)";
  const short = item.url.replace(/^https?:\/\//, "").replace(/\?.*/, "");
  return (
    <li
      className="enter-up"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "var(--space-sm)",
        alignItems: "baseline",
        fontSize: "var(--text-sm)",
      }}
    >
      <span aria-hidden style={{ color, width: "1em", textAlign: "center" }}>{mark}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span style={{ color: "var(--text-muted)" }}>{String(index + 1).padStart(2, "0")} ·</span>{" "}
        <span>{item.savedAs ?? short}</span>
        {item.imageCount !== undefined && (
          <span style={{ color: "var(--text-muted)", marginLeft: "var(--space-xs)" }}>
            이미지 {item.imageCount}장
          </span>
        )}
      </span>
      <span
        className="eyebrow"
        style={{ color, fontSize: "var(--text-xs)" }}
      >
        {STATUS_LABEL[item.status]}
      </span>
    </li>
  );
}
