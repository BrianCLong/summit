type Handlers = {
  onData?: (text: string) => void;
  onEvent?: (name: string, data: string) => void;
  onError?: (err: any) => void;
  onDone?: () => void;
};

export async function streamSSE(
  input: RequestInfo,
  init: RequestInit & { signal?: AbortSignal } = {},
  handlers: Handlers = {}
){
  try {
    const res = await fetch(input, { ...init, headers: { 'Accept': 'text/event-stream', ...(init.headers||{}) }}});
    if (!res.ok || !res.body) throw new Error(`SSE HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);

        let ev = "message";
        const data: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) ev = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5));
        }
        if (data.length) {
          const payload = data.join("\n");
          handlers.onEvent?.(ev, payload);
          if (ev === "message") handlers.onData?.(payload);
        }
      }
    }
    handlers.onDone?.();
  } catch (e) {
    handlers.onError?.(e);
  }
}