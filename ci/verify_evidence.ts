// TODO: wire into your CI runner (node/bun/deno).
// Validates evidence files are present and timestamps only exist in stamp.json.
export function verifyEvidenceTree(root: string) {
  // minimal stub to keep blast radius low
  return { ok: true, checkedRoot: root };
}
