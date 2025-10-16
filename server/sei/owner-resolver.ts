export function pickOwners(scores: { user: string; p: number }[], k = 2) {
  return scores
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
    .map((x) => x.user);
}
