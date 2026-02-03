import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { sanitizeFilePath } from '../utils/input-sanitization.js';

type PolicyBundleVerification = {
  ok: true;
  path: string;
  size: number;
  modified: Date;
  signatureVerified: boolean;
  digest: string;
  buf: Buffer;
};

const DEFAULT_ALLOWED_EXTENSIONS = ['.tar', '.tgz', '.tar.gz', '.bundle'];

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

async function ensureFileReadable(filePath: string, label: string) {
  const stat = await fs.stat(filePath).catch(() => {
    throw new Error(`${label} not found at ${filePath}`);
  });

  if (!stat.isFile()) {
    throw new Error(`${label} at ${filePath} is not a regular file`);
  }

  if (stat.size === 0) {
    throw new Error(`${label} at ${filePath} is empty`);
  }

  return stat;
}

function validateExtension(filePath: string) {
  const ext = DEFAULT_ALLOWED_EXTENSIONS.find((candidate) =>
    filePath.toLowerCase().endsWith(candidate),
  );
  if (!ext) {
    throw new Error(
      `policy bundle must use one of the allowed extensions: ${DEFAULT_ALLOWED_EXTENSIONS.join(', ')}`,
    );
  }
}

function digestFileBuffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

export async function loadSignedPolicy(
  bundlePath: string,
  sigPath?: string,
): Promise<PolicyBundleVerification> {
  assertNonEmptyString(bundlePath, 'bundlePath');

  // Security: Prevent argument injection in execFile
  if (bundlePath.startsWith('-')) {
    throw new Error('bundlePath cannot start with a hyphen');
  }

  // Security: Sanitize path to prevent Path Traversal
  const safeBundlePath = sanitizeFilePath(bundlePath);
  validateExtension(safeBundlePath);

  // Security: Pre-validate sigPath if provided
  let safeSigPath: string | undefined;
  if (sigPath) {
    assertNonEmptyString(sigPath, 'sigPath');
    if (sigPath.startsWith('-')) {
      throw new Error('sigPath cannot start with a hyphen');
    }
    safeSigPath = sanitizeFilePath(sigPath);
  }

  const allowUnsigned =
    (process.env.ALLOW_UNSIGNED_POLICY || 'false').toLowerCase() === 'true';

  if (!sigPath && !allowUnsigned) {
    throw new Error(
      'unsigned policy not allowed (set ALLOW_UNSIGNED_POLICY=true to override)',
    );
  }

  const stat = await ensureFileReadable(safeBundlePath, 'policy bundle');
  const buf = await fs.readFile(safeBundlePath);
  const digest = digestFileBuffer(buf);

  let signatureVerified = false;
  if (safeSigPath) {
    await ensureFileReadable(safeSigPath, 'policy signature');
    await new Promise<void>((res, rej) =>
      execFile(
        'cosign',
        ['verify-blob', '--signature', safeSigPath, safeBundlePath],
        (e) => (e ? rej(e) : res()),
      ),
    );
    signatureVerified = true;
  }

  return {
    ok: true,
    path: path.resolve(safeBundlePath),
    size: stat.size,
    modified: stat.mtime,
    signatureVerified,
    digest,
    buf,
  } as const;
}
