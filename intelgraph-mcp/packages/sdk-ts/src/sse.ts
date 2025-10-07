export type SseMessage = {
  id?: string;
  event?: string;
  data?: string;
};

export async function* sse(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new Error(`SSE failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf('\n\n');
    while (separator >= 0) {
      const frame = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const message: SseMessage = {};
      for (const line of frame.split('\n')) {
        if (line.startsWith('id:')) message.id = line.slice(3).trim();
        if (line.startsWith('event:')) message.event = line.slice(6).trim();
        if (line.startsWith('data:')) message.data = line.slice(5).trim();
      }
      yield message;
      separator = buffer.indexOf('\n\n');
    }
  }
}
