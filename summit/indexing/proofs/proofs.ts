// Proof object: client proves possession of file/subtree hash.
export interface ContentProof {
  path_token: string;
  hash: string; // sha256
}

export function canServeResult(
  resultMeta: { path_token: string; required_hash?: string },
  proofs: ContentProof[]
): boolean {
  const req = resultMeta.required_hash;
  if (!req) {
    return false; // deny-by-default
  }
  return proofs.some(
    (p) => p.path_token === resultMeta.path_token && p.hash === req
  );
}
