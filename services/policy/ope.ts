export function ips(
  samples: { p_beh: number; p_new: number; reward: number }[],
) {
  const w = samples.map((s) => (s.p_new / (s.p_beh + 1e-9)) * s.reward);
  return w.reduce((a, b) => a + b, 0) / samples.length;
}
