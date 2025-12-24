import fs from 'node:fs';
import path from 'node:path';
import type { GateResult, SecretScanConfig } from './types.js';
import { findFilesByGlob } from './walker.js';

const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /(?:secret|token|password|api[-_]?key)\s*[:=]\s*["']?[A-Za-z0-9\-_=]{16,}["']?/i,
  /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/,
  /xox[baprs]-[0-9A-Za-z-]+/, // Slack tokens
  /ghp_[0-9A-Za-z]{36}/
];

export async function scanForSecrets(rootDir: string, config: SecretScanConfig): Promise<GateResult> {
  const allowlist = (config.allowPatterns ?? []).map((pattern) => new RegExp(pattern));
  const matches: string[] = [];
  const files: string[] = [];

  for (const basePath of config.paths) {
    const resolvedBase = path.resolve(rootDir, basePath);
    const globPattern = path.relative(rootDir, resolvedBase).startsWith('**') ? basePath : '**/*';
    const discovered = await findFilesByGlob(resolvedBase, [globPattern]);
    files.push(...discovered);
  }

  for (const file of files) {
    if (config.excludedGlobs?.some((pattern) => file.includes(pattern.replace('*', '')))) {
      continue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    const relative = path.relative(rootDir, file);
    for (const pattern of SECRET_PATTERNS) {
      const match = content.match(pattern);
      if (match && !isAllowlisted(match[0], allowlist)) {
        matches.push(`${relative}: ${match[0]}`);
        break;
      }
    }
  }

  return {
    gate: 'secret-scan',
    ok: matches.length === 0,
    details: matches.length ? matches : ['Secret scan clean']
  };
}

function isAllowlisted(value: string, allowlist: RegExp[]): boolean {
  return allowlist.some((pattern) => pattern.test(value));
}
