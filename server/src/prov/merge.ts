import { createHash } from 'crypto';

function computeMerkleRoot(leaves: string[]) {
  if (!leaves || leaves.length === 0) return '';
  let level = leaves.map((x) => Buffer.from(x));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] || level[i];
      next.push(
        createHash('sha256')
          .update(Buffer.concat([a, b]))
          .digest(),
      );
    }
    level = next;
  }
  return 'sha256:' + level[0].toString('hex');
}

export async function mergeRemoteProvenance(
  runId: string,
  remoteRoot: string,
  leaves: string[],
) {
  const local = computeMerkleRoot(leaves);
  if (local !== remoteRoot) throw new Error('provenance mismatch');
  return { verified: true, root: local, runId };
}
