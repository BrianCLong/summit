#!/usr/bin/env ts-node
/**
 * Generates `policy-input.json` for Securiteyes OPA gates from CI artifacts.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch (error) {
    console.warn(`[securiteyes-policy-input] unable to parse ${filePath}:`, (error as Error).message);
    return fallback;
  }
}

const sbom = existsSync('sbom.json') ? readJson('sbom.json', { vulnerabilities: [] as unknown[] }) : { vulnerabilities: [] };
const secrets = existsSync('secrets.json') ? readJson('secrets.json', [] as unknown[]) : [];
const polygraph = existsSync('polygraph.json') ? readJson('polygraph.json', null) : null;

const coverage = Number(process.env.UNIT_COVERAGE ?? '0');
const e2ePass = (process.env.CRITICAL_E2E_PASS ?? 'true').toLowerCase() === 'true';
const provenanceVerified = (process.env.PROVENANCE_VERIFIED ?? 'true').toLowerCase() === 'true';

const input: Record<string, unknown> = {
  pr: {
    sbom: { clean: !(Array.isArray((sbom as any).vulnerabilities) && (sbom as any).vulnerabilities.length > 0) },
    secrets: { leaks: Array.isArray(secrets) ? secrets.length : 0 },
    provenance: { verified: provenanceVerified },
    tests: { unit: Number.isFinite(coverage) ? coverage : 0, critical_e2e_pass: e2ePass },
    labels: [],
  },
};

if (polygraph && typeof polygraph === 'object') {
  const { score, confidence } = polygraph as { score?: number; confidence?: string };
  (input.pr as any).polygraph = {
    score: typeof score === 'number' ? score : 0,
    confidence: typeof confidence === 'string' ? confidence : 'low',
  };
}

try {
  const mode = readJson('.securiteyes/mode.json', null);
  if (mode) {
    (input as any)._securiteyes = mode;
  }
} catch (error) {
  console.warn('[securiteyes-policy-input] unable to merge mode:', (error as Error).message);
}

writeFileSync('policy-input.json', JSON.stringify(input, null, 2));
console.log('policy-input.json generated');
