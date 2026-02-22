import { detectTemporalIntent } from "./temporalIntent";
import { fuseTemporal, TemporalDoc, ScoredTemporalDoc } from "./temporalRerank";

export interface BaseRetriever {
  // returns over-fetched candidates with simScore and publishedAt populated
  search(query: string, k: number): Promise<TemporalDoc[]>;
}

export async function temporalRetrieve(
  base: BaseRetriever,
  query: string,
  k = 10,
  now = new Date()
): Promise<ScoredTemporalDoc[]> {
  const intent = detectTemporalIntent(query);
  const overfetch = await base.search(query, k * 5);

  let filtered = overfetch;
  if (intent.range) {
    filtered = overfetch.filter(d => {
      const t = new Date(d.publishedAt);
      return t >= intent.range!.from && t <= intent.range!.to;
    });
  }

  const alpha = intent.cls === "STATIC" ? 0.9 : 0.6; // stronger recency when time-sensitive
  return fuseTemporal(filtered, now, alpha).slice(0, k);
}
