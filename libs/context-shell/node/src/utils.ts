import crypto from 'node:crypto';
import path from 'node:path';

export const DEFAULT_LIMITS = {
  maxOutputBytes: 64 * 1024,
  maxExecMs: 5_000,
  maxSteps: 2_000,
  maxFileBytes: 512 * 1024,
};

export const DEFAULT_REDACTIONS = [
  { id: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g },
  { id: 'jwt', pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/g },
  { id: 'private_key', pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g },
];

export const DEFAULT_DENYLIST = [
  { id: 'env-file', pattern: /(^|\/)\.env(\.|$)/ },
  { id: 'ssh-key', pattern: /id_rsa/ },
  { id: 'secrets-dir', pattern: /(^|\/)(secrets|keys)(\/|$)/ },
];

export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizePath(root: string, targetPath: string): string {
  const resolved = path.resolve(root, targetPath);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(`${rootResolved}${path.sep}`)) {
    throw new Error('Path escapes root scope');
  }
  return resolved;
}

export function applyRedactions(
  value: string,
  redactions: Array<{ id: string; pattern: RegExp; replacement?: string }>
): { value: string; applied: string[] } {
  let updated = value;
  const applied: string[] = [];
  for (const rule of redactions) {
    if (rule.pattern.test(updated)) {
      updated = updated.replace(rule.pattern, rule.replacement ?? '[REDACTED]');
      applied.push(rule.id);
    }
  }
  return { value: updated, applied };
}

export function clampOutput(value: string, maxBytes: number): { value: string; truncated: boolean } {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.length <= maxBytes) {
    return { value, truncated: false };
  }
  const truncated = buffer.subarray(0, maxBytes).toString('utf8');
  return { value: truncated, truncated: true };
}

export function toPosixPath(root: string, fullPath: string): string {
  const relative = path.relative(root, fullPath);
  return relative.split(path.sep).join('/');
}

export function stableStringify(payload: Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const value = payload[key];
    normalized[key] = value;
  }
  return JSON.stringify(normalized);
}
