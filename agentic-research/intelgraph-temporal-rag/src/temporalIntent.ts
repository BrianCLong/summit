export type TemporalClass = "REAL_TIME" | "FAST" | "HISTORICAL" | "STATIC";

export interface TemporalIntent {
  cls: TemporalClass;
  range?: { from: Date; to: Date };
}

export function detectTemporalIntent(q: string): TemporalIntent {
  const s = q.toLowerCase();
  if (/(right now|currently|today|live)/.test(s)) return { cls: "REAL_TIME" };
  if (/(latest|recent|this week|current)/.test(s)) return { cls: "FAST" };
  const year = s.match(/\b(19|20)\d{2}\b/);
  if (year) {
    const y = Number(year[0]);
    return { cls: "HISTORICAL", range: { from: new Date(`${y}-01-01T00:00:00Z`), to: new Date(`${y}-12-31T23:59:59Z`) } };
  }
  return { cls: "STATIC" };
}
