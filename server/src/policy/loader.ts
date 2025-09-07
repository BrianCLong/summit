import { execFile } from 'node:child_process';
import { promises as fs } from 'fs';

export async function loadSignedPolicy(bundlePath: string, sigPath: string) {
  await new Promise<void>((res, rej) =>
    execFile('cosign', ['verify-blob', '--signature', sigPath, bundlePath], (e) => (e ? rej(e) : res())),
  );
  const buf = await fs.readFile(bundlePath);
  if (!buf || buf.length === 0) throw new Error('empty policy bundle');
  return { ok: true } as const;
}
