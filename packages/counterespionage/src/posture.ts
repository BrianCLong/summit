export type PersistenceSignal =
  | { id: "SIG-EDGE-NO-MONITOR-001"; severity: "high" | "med" | "low"; count: number }
  | { id: "SIG-LONG-LIVED-CREDS-001"; severity: "high" | "med" | "low"; count: number };

export type PostureResult = {
  item: "APT2025ESP";
  score: number; // 0-100, higher is better
  signals: PersistenceSignal[];
  top_gaps: string[];
};

export function computePosture(signals: PersistenceSignal[]): PostureResult {
  // Deny-by-default: start pessimistic.
  let score = 40;
  for (const s of signals) {
    if (s.severity === "high") score -= Math.min(20, s.count * 2);
    if (s.severity === "med") score -= Math.min(10, s.count);
  }
  score = Math.max(0, Math.min(100, score));
  return {
    item: "APT2025ESP",
    score,
    signals,
    top_gaps: signals.filter(s => s.severity === "high").map(s => s.id)
  };
}
