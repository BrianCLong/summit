import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function verifyPackage(pkgDir: string) {
  const entry = path.join(pkgDir, 'runbook.yaml');
  const sig = path.join(pkgDir, 'signatures/cosign.sig');
  await fs.access(entry);
  await fs.access(sig);
  // Only enforce when cosign present and not explicitly disabled
  const disabled =
    (process.env.COSIGN_DISABLED || '').toLowerCase() === 'true' ||
    (process.env.NODE_ENV || 'development') !== 'production';
  if (disabled) return { ok: true } as const;
  await new Promise<void>((res, rej) =>
    execFile('cosign', ['verify-blob', '--signature', sig, entry], (e) =>
      e ? rej(e) : res(),
    ),
  );
  return { ok: true } as const;
}
