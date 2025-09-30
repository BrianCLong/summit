import { useCallback, useRef, useState } from 'react';
import { streamSSE } from '../lib/sse';

export function useRagStream(headers?: Record<string,string>){
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController|null>(null);

  const start = useCallback(async (question: string) => {
    if (running) return;
    setAnswer(""); setCitations([]); setRunning(true);
    const ac = new AbortController(); abortRef.current = ac;

    await streamSSE('/v1/rag/answer/stream', {
      method:'POST',
      body: JSON.stringify({ question }),
      headers: { 'Content-Type':'application/json', ...(headers||{}) },
      signal: ac.signal
    }, {
      onEvent: (name, data) => {
        if (name === 'citations') {
          try { setCitations(JSON.parse(data)); } catch {}
        } else if (name === 'error') {
          setAnswer(prev => prev + `\n[error] ${data}\n`);
        } else if (name === 'message') {
          setAnswer(prev => prev + data);
        }
      },
      onDone: () => setRunning(false),
      onError: () => setRunning(false)
    });
  }, [headers, running]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  return { answer, citations, running, start, stop };
}