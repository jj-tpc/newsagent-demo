import { spawn } from "node:child_process";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_KEYWORD = 50;
const MIN_COUNT = 1;
const MAX_COUNT = 20;

function sseEvent(name: string | null, data: string): string {
  const lines = [];
  if (name) lines.push(`event: ${name}`);
  for (const line of data.split("\n")) lines.push(`data: ${line}`);
  return lines.join("\n") + "\n\n";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const countRaw = url.searchParams.get("count") ?? "5";
  const count = Math.floor(Number(countRaw));

  if (!keyword || keyword.length > MAX_KEYWORD) {
    return Response.json({ error: `keyword required (1-${MAX_KEYWORD} chars)` }, { status: 400 });
  }
  if (!Number.isFinite(count) || count < MIN_COUNT || count > MAX_COUNT) {
    return Response.json({ error: `count must be ${MIN_COUNT}-${MAX_COUNT}` }, { status: 400 });
  }

  const pythonBin = process.env.PYTHON_BIN || (process.platform === "win32" ? "py" : "python3");
  const scriptPath = path.join(process.cwd(), "크롤러", "crawl.py");
  const args = [scriptPath, "--keyword", keyword, "--count", String(count)];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const proc = spawn(pythonBin, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdoutBuf = "";
      let stderrBuf = "";

      function emitLines(buf: string, channel: string): string {
        const parts = buf.split("\n");
        const tail = parts.pop() ?? "";
        for (const line of parts) {
          const prefix = channel === "stderr" ? "[stderr] " : "";
          controller.enqueue(encoder.encode(sseEvent(null, prefix + line)));
        }
        return tail;
      }

      proc.stdout.setEncoding("utf-8");
      proc.stdout.on("data", (chunk: string) => {
        stdoutBuf = emitLines(stdoutBuf + chunk, "stdout");
      });
      proc.stderr.setEncoding("utf-8");
      proc.stderr.on("data", (chunk: string) => {
        stderrBuf = emitLines(stderrBuf + chunk, "stderr");
      });

      proc.on("error", (err) => {
        controller.enqueue(encoder.encode(sseEvent("error", String(err.message))));
        try { controller.close(); } catch {}
      });

      proc.on("close", (code) => {
        if (stdoutBuf) controller.enqueue(encoder.encode(sseEvent(null, stdoutBuf)));
        if (stderrBuf) controller.enqueue(encoder.encode(sseEvent(null, "[stderr] " + stderrBuf)));
        controller.enqueue(encoder.encode(sseEvent("done", JSON.stringify({ exitCode: code ?? -1 }))));
        try { controller.close(); } catch {}
      });

      req.signal.addEventListener("abort", () => {
        if (!proc.killed) proc.kill();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
