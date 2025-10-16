export function pack(paths: string[], target = 6) {
  const items = paths.map((p) => ({ p, t: eta(p) })).sort((a, b) => b.t - a.t);
  const shards: Array<{ t: number; files: string[] }> = Array.from(
    { length: target },
    () => ({ t: 0, files: [] }),
  );
  for (const it of items) {
    shards.sort((a, b) => a.t - b.t)[0].files.push(it.p);
    shards[0].t += it.t;
  }
  return shards;
}
