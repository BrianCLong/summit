import { execFile } from 'node:child_process';
import { promises as fs } from 'fs';

export async function loadSignedPolicy(bundlePath: string, sigPath?: string) {
  const allowUnsigned =
    (process.env.ALLOW_UNSIGNED_POLICY || 'false').toLowerCase() === 'true';
  if (!sigPath && !allowUnsigned) {
    throw new Error(
      'unsigned policy not allowed (set ALLOW_UNSIGNED_POLICY=true to override)',
    );
  }
  if (sigPath) {
    await new Promise<void>((res, rej) =>
      execFile(
        'cosign',
        ['verify-blob', '--signature', sigPath!, bundlePath],
        (e) => (e ? rej(e) : res()),
      ),
    );
  }
  const buf = await fs.readFile(bundlePath);
  if (!buf || buf.length === 0) throw new Error('empty policy bundle');
  return { ok: true } as const;
}
