import { compare } from './util/diff';
export async function shadowQuery(q) {
  const cur = await searchActive(q);
  const cand = await searchCandidate(q);
  const { jaccard, overlapAt10 } = compare(cur.top10, cand.top10);
  metrics.shadow_overlap10.observe(overlapAt10);
  if (overlapAt10 < 0.6) metrics.shadow_low_overlap_total.inc();
  return cur; // serve active results, record cand
}
