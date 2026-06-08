// fetch ReadableStream에서 받은 SSE 텍스트를 이벤트로 파싱하는 클라이언트 헬퍼.
// EventSource는 GET 전용이라 POST + 스트림에는 못 쓰므로 직접 파싱한다.

export interface SseEvent {
  event: string;
  data: string;
}

export async function* readSse(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  const onAbort = () => { void reader.cancel(); };
  signal?.addEventListener("abort", onAbort);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buf.trim()) yield* parseChunk(buf);
        return;
      }
      buf += decoder.decode(value, { stream: true });
      let sep = buf.indexOf("\n\n");
      while (sep >= 0) {
        const chunk = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        yield* parseChunk(chunk);
        sep = buf.indexOf("\n\n");
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try { reader.releaseLock(); } catch { /* released by cancel */ }
  }
}

function* parseChunk(chunk: string): Generator<SseEvent> {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^\s/, ""));
    }
  }
  if (dataLines.length > 0) yield { event, data: dataLines.join("\n") };
}
