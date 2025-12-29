import fs from 'fs';
import path from 'path';

export interface PolicyConfig {
  policies: Array<{ id: string; allow?: string[]; deny?: string[]; reason: string }>;
}

export interface EvaluationResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
}

export function loadPolicies(): PolicyConfig {
  const configPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'policies', 'default.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as PolicyConfig;
}

export function evaluateOperation(operation: string, config: PolicyConfig): EvaluationResult {
  const normalized = operation.toLowerCase();
  for (const policy of config.policies) {
    if (policy.deny?.some((term) => normalized.includes(term.toLowerCase()))) {
      return { allowed: false, reason: policy.reason, matchedPolicy: policy.id };
    }
    if (policy.allow?.some((term) => normalized.includes(term.toLowerCase()))) {
      return { allowed: true, reason: policy.reason, matchedPolicy: policy.id };
    }
  }
  return { allowed: false, reason: 'Denied by default (no matching policy)' };
}

export function snapshotPolicy(config: PolicyConfig): string {
  const sorted = config.policies
    .map((p) => ({ ...p, allow: p.allow?.sort(), deny: p.deny?.sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ policies: sorted }, null, 2);
}

export function diffPolicies(before: PolicyConfig, after: PolicyConfig): string {
  const beforeSnap = snapshotPolicy(before);
  const afterSnap = snapshotPolicy(after);
  if (beforeSnap === afterSnap) {
    return 'no-change';
  }
  return `before:\n${beforeSnap}\n---\nafter:\n${afterSnap}`;
}
