import { execFile } from 'node:child_process';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

export interface LoadedPolicyBundle {
  ok: true;
  bundlePath: string;
  signaturePath?: string;
  digest: string;
}

function assertReadableFile(filePath: string, label: string) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error(`${label} path must be a non-empty string`);
  }

  const normalized = path.resolve(filePath);
  return fs
    .stat(normalized)
    .then((stats) => {
      if (!stats.isFile()) {
        throw new Error(`${label} ${normalized} is not a file`);
      }
      return normalized;
    })
    .catch((err) => {
      throw new Error(`${label} ${normalized} not readable: ${err.message}`);
    });
}

async function verifySignature(bundle: string, signature: string) {
  await new Promise<void>((res, rej) =>
    execFile(
      'cosign',
      ['verify-blob', '--signature', signature, bundle],
      (e) => (e ? rej(e) : res()),
    ),
  );
}

export async function loadSignedPolicy(
  bundlePath: string,
  sigPath?: string,
): Promise<LoadedPolicyBundle> {
  const allowUnsigned =
    (process.env.ALLOW_UNSIGNED_POLICY || 'false').toLowerCase() === 'true';

  const normalizedBundle = await assertReadableFile(bundlePath, 'bundle');

  if (!sigPath && !allowUnsigned) {
    throw new Error(
      'unsigned policy not allowed (set ALLOW_UNSIGNED_POLICY=true to override)',
    );
  }

  let normalizedSig: string | undefined;
  if (sigPath) {
    normalizedSig = await assertReadableFile(sigPath, 'signature');
    await verifySignature(normalizedBundle, normalizedSig);
  }

  const buf = await fs.readFile(normalizedBundle);
  if (!buf || buf.length === 0)
    throw new Error('empty policy bundle after validation');

  const digest = createHash('sha256').update(buf).digest('hex');

  return {
    ok: true,
    bundlePath: normalizedBundle,
    signaturePath: normalizedSig,
    digest,
  } as const;
}
