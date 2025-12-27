import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'fs';
import path from 'path';

export type PolicyBundleVerificationResult = {
  ok: true;
  path: string;
  size: number;
  modified: Date;
  signatureVerified: boolean;
  digest: string;
};

const DEFAULT_ALLOWED_EXTENSIONS = ['.tar', '.tgz', '.tar.gz', '.bundle', '.json'];

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
): Promise<PolicyBundleVerificationResult> {
  assertNonEmptyString(bundlePath, 'bundlePath');
  validateExtension(bundlePath);

  const allowUnsigned =
    (process.env.ALLOW_UNSIGNED_POLICY || 'false').toLowerCase() === 'true';

  if (!sigPath && !allowUnsigned) {
    throw new Error(
      'unsigned policy not allowed (set ALLOW_UNSIGNED_POLICY=true to override)',
    );
  }

  const stat = await ensureFileReadable(bundlePath, 'policy bundle');
  const buf = await fs.readFile(bundlePath);
  const digest = digestFileBuffer(buf);

  let signatureVerified = false;
  if (sigPath) {
    assertNonEmptyString(sigPath, 'sigPath');
    await ensureFileReadable(sigPath, 'policy signature');
    await new Promise<void>((res, rej) =>
      execFile('cosign', ['verify-blob', '--signature', sigPath!, bundlePath], (e) =>
        e ? rej(e) : res(),
      ),
    );
    signatureVerified = true;
  }

  return {
    ok: true,
    path: path.resolve(bundlePath),
    size: stat.size,
    modified: stat.mtime,
    signatureVerified,
    digest,
  } as const;
}

export function policyHotReloadEnabled() {
  return (process.env.POLICY_HOT_RELOAD || 'false').toLowerCase() === 'true';
}

export async function loadAndValidatePolicyBundle(
  bundlePath: string,
  sigPath?: string,
) {
  if (!policyHotReloadEnabled()) {
    throw new Error('policy hot reload disabled by configuration');
  }

  const verification = await loadSignedPolicy(bundlePath, sigPath);
  const raw = await fs.readFile(bundlePath, { encoding: 'utf-8' });
  const parsed = JSON.parse(String(raw));
  const { tenantPolicyBundleSchema } = await import('./tenantBundle.js');
  const bundle = tenantPolicyBundleSchema.parse(parsed);

  return { bundle, verification } as const;
}
