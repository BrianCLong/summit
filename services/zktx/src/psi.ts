export type PsiSet = string[];

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

export async function privateSetIntersect(a: PsiSet, b: PsiSet) {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new Error('invalid_input');
  const bs = new Set(b.map(normalizeToken));
  const seen = new Set<string>();
  return a
    .map(normalizeToken)
    .filter((token) => {
      const match = bs.has(token) && !seen.has(token);
      if (match) seen.add(token);
      return match;
    })
    .map((token) => token);
}
