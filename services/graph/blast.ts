export function blastRadius(
  files: string[],
  G: Record<string, string[]>,
  max = 3,
) {
  const seen = new Set(files);
  let frontier = files.slice();
  for (let d = 0; d < max; d++) {
    const next: string[] = [];
    frontier.forEach((f) =>
      (G[f] || []).forEach((n) => {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }),
    );
    frontier = next;
    if (!frontier.length) break;
  }
  return seen.size;
}
