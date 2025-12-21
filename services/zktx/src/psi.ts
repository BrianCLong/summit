// Interface only; implementation deferred (would use libsodium + ECDH PSI)
export type PsiSet = string[]; // pre-hashed tokens

export async function privateSetIntersect(a: PsiSet, b: PsiSet) {
  // mock intersection
  const bs = new Set(b);
  return a.filter((x) => bs.has(x));
}
