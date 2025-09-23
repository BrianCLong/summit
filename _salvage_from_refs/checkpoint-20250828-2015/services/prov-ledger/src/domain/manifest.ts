import crypto from 'crypto';

export type ManifestEntry = { path: string; sha256: string; size: number };
export type Manifest = { root: string; algorithm: 'sha256'; entries: ManifestEntry[]; counts: { files: number }; generatedAt: string; bundleId?: string };

export namespace Manifest {
  export async function sha256(buf: Buffer | Uint8Array | string): Promise<string> {
    const h = crypto.createHash('sha256');
    h.update(typeof buf === 'string' ? Buffer.from(buf) : Buffer.from(buf));
    return h.digest('hex');
  }
}

function hashPair(a: string, b: string): string {
  const h = crypto.createHash('sha256');
  const A = Buffer.from(a, 'hex');
  const B = Buffer.from(b, 'hex');
  h.update(A);
  h.update(B);
  return h.digest('hex');
}

export async function buildManifest(entries: ManifestEntry[]): Promise<Manifest> {
  // Sort entries deterministically by path
  const sorted = [...entries].sort((x, y) => x.path.localeCompare(y.path));
  // Construct leaf hashes as sha256( sha256(path) + sha256(file) )
  const leaves = await Promise.all(sorted.map(async (e) => {
    const pathHash = await Manifest.sha256(e.path);
    const fileHash = e.sha256;
    return hashPair(pathHash, fileHash);
  }));

  let level = leaves;
  if (level.length === 0) level = [await Manifest.sha256('')];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i]; // duplicate last if odd
      next.push(hashPair(left, right));
    }
    level = next;
  }
  const root = level[0];
  return {
    root,
    algorithm: 'sha256',
    entries: sorted,
    counts: { files: sorted.length },
    generatedAt: new Date().toISOString()
  };
}
