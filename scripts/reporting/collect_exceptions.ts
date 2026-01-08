import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { z } from 'zod';
import { createHash } from 'crypto';

// --- Types & Schemas ---

const ExceptionTypeSchema = z.object({
  max_ttl_days: z.number().positive(),
  required_fields: z.array(z.string()),
  grace_period_days: z.number().nonnegative(),
});

const PolicySchema = z.object({
  policy_version: z.string(),
  enforcement_mode: z.enum(['report_only', 'fail_on_violation']),
  exception_types: z.record(z.string(), ExceptionTypeSchema),
  allowlist: z.array(z.object({
    id: z.string(),
    owner: z.string(),
    expires_at: z.string().datetime(),
    rationale: z.string(),
  })).optional(),
});

type Policy = z.infer<typeof PolicySchema>;

interface ExceptionEntry {
  exception_id: string;
  type: string;
  owner: string;
  created_at?: string;
  expires_at: string;
  scope: string;
  bindings: {
    policy_bundle_hash?: string;
    evidence_hashes?: string[];
  };
  status: 'ACTIVE' | 'WARNING' | 'OVERDUE' | 'VIOLATION' | 'CLOSED';
  rationale: string;
}

// --- Helpers ---

const loadPolicy = (filepath: string): Policy => {
  const content = fs.readFileSync(filepath, 'utf8');
  return PolicySchema.parse(yaml.load(content));
};

const readJsonl = (filepath: string): any[] => {
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, 'utf8');
  return content
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
};

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const calculateStatus = (
  expiresAt: string,
  graceDays: number,
  now: Date
): ExceptionEntry['status'] => {
  const expiry = new Date(expiresAt);
  const graceEnd = new Date(expiry);
  graceEnd.setDate(graceEnd.getDate() + graceDays);

  const warningStart = new Date(expiry);
  warningStart.setDate(warningStart.getDate() - 7);

  if (now >= graceEnd) return 'VIOLATION';
  if (now >= expiry) return 'OVERDUE';
  if (now >= warningStart) return 'WARNING';
  return 'ACTIVE';
};

const normalizeBreakGlass = (record: any, policy: Policy, now: Date): ExceptionEntry => {
  const typeConfig = policy.exception_types['BREAK_GLASS'];
  if (!typeConfig) throw new Error('BREAK_GLASS type not defined in policy');

  const createdAt = record.created_at;
  const expiresAt = addDays(createdAt, typeConfig.max_ttl_days);

  return {
    exception_id: record.id,
    type: 'BREAK_GLASS',
    owner: record.owner,
    created_at: createdAt,
    expires_at: expiresAt,
    scope: record.scope,
    rationale: record.rationale,
    bindings: {
      evidence_hashes: record.evidence_hash ? [record.evidence_hash] : [],
    },
    status: calculateStatus(expiresAt, typeConfig.grace_period_days, now),
  };
};

const normalizeDecision = (record: any, policy: Policy, now: Date): ExceptionEntry => {
  const type = record.decision_type;
  const typeConfig = policy.exception_types[type];

  // If type is not in policy, we might want to skip or treat as generic.
  // For strictness, if it maps to a known exception type in policy, we process it.
  if (!typeConfig) {
      // Fallback or skip? Let's assume only monitored types matter.
      // But we should probably error if we can't determine TTL if expires_at is missing.
      // However, decision logs usually have explicit expires_at.
      // Let's support explicit expires_at even if type unknown, or skip.
      // The prompt says "decision_type includes time-bounded exceptions".
      // We will only process types defined in policy.
      return null as any;
  }

  return {
    exception_id: record.decision_id,
    type: type,
    owner: record.owner,
    created_at: record.timestamp,
    expires_at: record.expires_at, // Assumed present for decisions
    scope: record.scope,
    rationale: record.rationale,
    bindings: {}, // Decision log might not have hashes easily accessible unless in context
    status: calculateStatus(record.expires_at, typeConfig.grace_period_days, now),
  };
};

// --- Main ---

const main = () => {
  const policyPath = 'ci/exception-lifecycle-policy.yml';
  const breakGlassPath = 'ci/break-glass/overrides.jsonl';
  const decisionLogPath = 'ci/decision-log/decisions.jsonl';
  const outputPath = 'dist/exceptions/exceptions.json';
  const proofsPath = 'dist/exceptions/proofs';

  // Ensure output dirs
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(proofsPath, { recursive: true });

  const policy = loadPolicy(policyPath);
  const now = new Date();

  const exceptions: ExceptionEntry[] = [];

  // Process Break Glass
  const breakGlassRecords = readJsonl(breakGlassPath);
  breakGlassRecords.forEach(r => {
    try {
        exceptions.push(normalizeBreakGlass(r, policy, now));
    } catch (e) {
        console.error(`Skipping invalid Break Glass record ${r.id}:`, e);
    }
  });

  // Process Decision Log
  const decisionRecords = readJsonl(decisionLogPath);
  decisionRecords.forEach(r => {
    const entry = normalizeDecision(r, policy, now);
    if (entry) exceptions.push(entry);
  });

  // Process Allowlist (Overrides)
  if (policy.allowlist) {
    policy.allowlist.forEach(allow => {
        // Check if this allowlist entry overrides an existing exception status?
        // Or is it a standalone exception entry?
        // Prompt says: "explicit exception IDs that are exempt with an expiry of their own"
        // This suggests we should find the matching exception and update its expiry/status,
        // OR add it if it's a "pre-approved" exception.
        // Usually allowlist overrides existing violations.
        // Let's implementation: Update existing entry if ID matches.

        const existing = exceptions.find(e => e.exception_id === allow.id);
        if (existing) {
            existing.expires_at = allow.expires_at;
            existing.status = calculateStatus(allow.expires_at, 0, now); // No grace period logic needed or use default?
            // Using 0 grace period for allowlist as they are explicit overrides.
        }
    });
  }

  // Sort Deterministically: Severity (VIOLATION > OVERDUE > WARNING > ACTIVE) -> ExpiresAt -> ID
  const severityScore = { 'VIOLATION': 4, 'OVERDUE': 3, 'WARNING': 2, 'ACTIVE': 1, 'CLOSED': 0 };

  exceptions.sort((a, b) => {
    const scoreA = severityScore[a.status];
    const scoreB = severityScore[b.status];
    if (scoreA !== scoreB) return scoreB - scoreA; // Descending severity

    if (a.expires_at !== b.expires_at) return a.expires_at.localeCompare(b.expires_at);
    return a.exception_id.localeCompare(b.exception_id);
  });

  // Write Output
  fs.writeFileSync(outputPath, JSON.stringify(exceptions, null, 2));
  console.log(`Generated ${outputPath} with ${exceptions.length} exceptions.`);

  // Generate Proofs (Source Index)
  const sourceIndex = {
    sources: [
        { path: policyPath, hash: createHash('sha256').update(fs.readFileSync(policyPath)).digest('hex') },
        { path: breakGlassPath, hash: fs.existsSync(breakGlassPath) ? createHash('sha256').update(fs.readFileSync(breakGlassPath)).digest('hex') : null },
        { path: decisionLogPath, hash: fs.existsSync(decisionLogPath) ? createHash('sha256').update(fs.readFileSync(decisionLogPath)).digest('hex') : null },
    ],
    generated_at: now.toISOString()
  };
  fs.writeFileSync(path.join(proofsPath, 'source-index.json'), JSON.stringify(sourceIndex, null, 2));
};

main();
