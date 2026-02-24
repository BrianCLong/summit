export interface TemporalDoc {
  id: string;
  text: string;
  publishedAt: string; // ISO
  simScore: number;    // base semantic similarity score (0..1)
}

export interface ScoredTemporalDoc extends TemporalDoc {
  recency: number;
  fused: number;
}

export function recencyWeight(docTime: Date, now: Date, halfLifeDays = 7): number {
  const days = (now.getTime() - docTime.getTime()) / (1000 * 60 * 60 * 24);
  const lambda = Math.log(2) / halfLifeDays;
  return Math.exp(-lambda * Math.max(days, 0));
}

export function fuseTemporal(docs: TemporalDoc[], now: Date, alpha: number): ScoredTemporalDoc[] {
  return docs
    .map(d => {
      const r = recencyWeight(new Date(d.publishedAt), now);
      const fused = alpha * d.simScore + (1 - alpha) * r;
      return { ...d, recency: r, fused };
    })
    .sort((a, b) => b.fused - a.fused);
}
