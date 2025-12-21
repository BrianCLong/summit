export type LogEntry = { ts: number; op: string; key?: string; value?: any };

export function replay(entries: LogEntry[]) {
  const state: Record<string, any> = {};
  const ordered = [...entries].sort((a, b) => a.ts - b.ts);
  for (const e of ordered) {
    if (e.op === 'set' && e.key) state[e.key] = e.value;
  }
  return state;
}
