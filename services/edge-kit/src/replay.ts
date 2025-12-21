export type LogEntry = { ts: number; op: 'set' | 'delete' | 'merge' | 'clear'; key?: string; value?: any };

export function replay(entries: LogEntry[]) {
  if (!Array.isArray(entries)) throw new Error('invalid_entries');
  const state: Record<string, any> = {};
  const ordered = [...entries].sort((a, b) => a.ts - b.ts);
  for (const e of ordered) {
    if (e.op === 'clear') {
      Object.keys(state).forEach((k) => delete state[k]);
      continue;
    }
    if (!e.key) continue;
    if (e.op === 'delete') {
      delete state[e.key];
    } else if (e.op === 'merge' && typeof state[e.key] === 'object' && !Array.isArray(state[e.key])) {
      state[e.key] = { ...(state[e.key] as object), ...(e.value as object) };
    } else if (e.op === 'set') {
      state[e.key] = e.value;
    }
  }
  return state;
}
