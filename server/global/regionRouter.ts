type Region = {
  id: string;
  p95: number;
  carbon: int;
  healthy: boolean;
  costUSDPerK: number;
};
export function pickRegion(
  rs: Region[],
  need: { maxP95: number; preferLowCarbon: boolean },
) {
  const healthy = rs.filter((r) => r.healthy && r.p95 <= need.maxP95);
  const scored = healthy.map((r) => ({
    r,
    s:
      r.costUSDPerK +
      (need.preferLowCarbon ? r.carbon * 1e-6 : 0) +
      r.p95 / 5000,
  }));
  return (
    scored.sort((a, b) => a.s - b.s)[0]?.r ||
    rs.sort((a, b) => a.p95 - b.p95)[0]
  );
}
