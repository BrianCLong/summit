import fs from 'fs';
import path from 'path';

// Data Interfaces & Allowed Keys Definition

interface MaturityEval {
  stage: string;
  timestamp: string;
}
const ALLOWED_MATURITY = new Set(['stage', 'timestamp']);

interface Readiness {
  shards: Record<string, { status: string; duration_ms: number }>;
  gates: Record<string, { required: boolean; outcome: string; last_run_id: string }>;
  tag_rehearsal?: { status: string; timestamp: string };
}
// For nested objects like shards/gates, we will use a custom sanitizer or assume strict structure.
// Here we will use a recursive sanitization with specific allowed structure.
// Since the structure is known, we can be explicit.

interface PolicyEvidence {
  bundle_id: string;
  bundle_hash: string;
  drift_status: string;
  evidence_summary: {
    pass_rate: number;
    total_checks: number;
    failed_checks: number;
  };
}
const ALLOWED_POLICY = new Set(['bundle_id', 'bundle_hash', 'drift_status', 'evidence_summary']);

interface DepsSummary {
  approval_required: boolean;
  approval_satisfied: boolean;
  changes_count: number;
  ratchet_state: string;
  diff_summary: unknown; // We will treat this as opaque but safe-listed keys only if known, or generic object if we trust it.
                         // To be safe, let's limit it to empty object or known safe summary fields if defined.
                         // For now, allow it but we might want to sanitize its internals if it contained diffs.
}
const ALLOWED_DEPS = new Set(['approval_required', 'approval_satisfied', 'changes_count', 'ratchet_state', 'diff_summary']);

interface PromotionGuard {
  last_decision: string;
  deny_reasons: string[];
  timestamp: string;
}
const ALLOWED_PROMOTION = new Set(['last_decision', 'deny_reasons', 'timestamp']);

interface IncidentDrills {
  scenarios: Record<string, { outcome: string; last_run: string }>;
  last_run_timestamp: string;
}
const ALLOWED_DRILLS = new Set(['scenarios', 'last_run_timestamp']);

interface FieldReadiness {
  readiness_decision: string;
  budgets_compliant: boolean;
  device_security_signals: unknown;
}
const ALLOWED_FIELD = new Set(['readiness_decision', 'budgets_compliant', 'device_security_signals']);

interface ComplianceSignals {
  generated_at: string;
  maturity: MaturityEval | 'MISSING';
  readiness: Readiness | 'MISSING';
  policy: PolicyEvidence | 'MISSING';
  dependencies: DepsSummary | 'MISSING';
  promotion: PromotionGuard | 'MISSING';
  incident_drills: IncidentDrills | 'MISSING';
  field_mode: FieldReadiness | 'MISSING';
  meta: {
    sources: Record<string, string>;
  };
}

function loadArtifact<T>(filepath: string): T | undefined {
  if (!fs.existsSync(filepath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse ${filepath}:`, e);
    return undefined;
  }
}

// Allowed fields only - deep clean function
// We implement a specific sanitizer for each type to ensure strict schema compliance
function sanitizeMaturity(obj: any): MaturityEval {
  return {
    stage: String(obj.stage || 'UNKNOWN'),
    timestamp: String(obj.timestamp || '')
  };
}

function sanitizeReadiness(obj: any): Readiness {
  const clean: Readiness = { shards: {}, gates: {} };

  if (obj.shards && typeof obj.shards === 'object') {
    for (const [k, v] of Object.entries(obj.shards) as any) {
      clean.shards[k] = {
        status: String(v.status),
        duration_ms: Number(v.duration_ms)
      };
    }
  }

  if (obj.gates && typeof obj.gates === 'object') {
    for (const [k, v] of Object.entries(obj.gates) as any) {
      clean.gates[k] = {
        required: Boolean(v.required),
        outcome: String(v.outcome),
        last_run_id: String(v.last_run_id)
      };
    }
  }

  if (obj.tag_rehearsal) {
    clean.tag_rehearsal = {
      status: String(obj.tag_rehearsal.status),
      timestamp: String(obj.tag_rehearsal.timestamp)
    };
  }

  return clean;
}

function sanitizePolicy(obj: any): PolicyEvidence {
  return {
    bundle_id: String(obj.bundle_id || ''),
    bundle_hash: String(obj.bundle_hash || ''),
    drift_status: String(obj.drift_status || 'UNKNOWN'),
    evidence_summary: {
      pass_rate: Number(obj.evidence_summary?.pass_rate || 0),
      total_checks: Number(obj.evidence_summary?.total_checks || 0),
      failed_checks: Number(obj.evidence_summary?.failed_checks || 0)
    }
  };
}

function sanitizeDeps(obj: any): DepsSummary {
  return {
    approval_required: Boolean(obj.approval_required),
    approval_satisfied: Boolean(obj.approval_satisfied),
    changes_count: Number(obj.changes_count || 0),
    ratchet_state: String(obj.ratchet_state || ''),
    diff_summary: {} // Opaque object, forcefully redacting to empty for now to prevent leaks until schema defined
  };
}

function sanitizePromotion(obj: any): PromotionGuard {
  return {
    last_decision: String(obj.last_decision || ''),
    deny_reasons: Array.isArray(obj.deny_reasons) ? obj.deny_reasons.map(String) : [],
    timestamp: String(obj.timestamp || '')
  };
}

function sanitizeDrills(obj: any): IncidentDrills {
  const clean: IncidentDrills = { scenarios: {}, last_run_timestamp: String(obj.last_run_timestamp || '') };
  if (obj.scenarios && typeof obj.scenarios === 'object') {
    for (const [k, v] of Object.entries(obj.scenarios) as any) {
      clean.scenarios[k] = {
        outcome: String(v.outcome),
        last_run: String(v.last_run)
      };
    }
  }
  return clean;
}

function sanitizeField(obj: any): FieldReadiness {
  return {
    readiness_decision: String(obj.readiness_decision || ''),
    budgets_compliant: Boolean(obj.budgets_compliant),
    device_security_signals: {} // Redact unknown structure
  };
}

// Main execution
const artifactsDir = process.env.ARTIFACTS_DIR || 'dist';
const outputDir = process.env.OUTPUT_DIR || 'dist/compliance';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Load raw
const rawMaturity = loadArtifact<MaturityEval>(path.join(artifactsDir, 'maturity/maturity-eval.json'));
const rawReadiness = loadArtifact<Readiness>(path.join(artifactsDir, 'readiness/readiness.json'));
const rawPolicy = loadArtifact<PolicyEvidence>(path.join(artifactsDir, 'policy-evidence/policy-evidence.json'));
const rawDeps = loadArtifact<DepsSummary>(path.join(artifactsDir, 'deps/deps-eval.json'));
const rawPromotion = loadArtifact<PromotionGuard>(path.join(artifactsDir, 'promotion/promotion-guard.json'));
const rawDrills = loadArtifact<IncidentDrills>(path.join(artifactsDir, 'drills/incident-drills.json'));
const rawField = loadArtifact<FieldReadiness>(path.join(artifactsDir, 'field/field-readiness.json'));

const signals: ComplianceSignals = {
  generated_at: new Date().toISOString(),
  maturity: rawMaturity ? sanitizeMaturity(rawMaturity) : 'MISSING',
  readiness: rawReadiness ? sanitizeReadiness(rawReadiness) : 'MISSING',
  policy: rawPolicy ? sanitizePolicy(rawPolicy) : 'MISSING',
  dependencies: rawDeps ? sanitizeDeps(rawDeps) : 'MISSING',
  promotion: rawPromotion ? sanitizePromotion(rawPromotion) : 'MISSING',
  incident_drills: rawDrills ? sanitizeDrills(rawDrills) : 'MISSING',
  field_mode: rawField ? sanitizeField(rawField) : 'MISSING',
  meta: {
    sources: {}
  }
};

// Populate meta.sources status
const sourcesMap = {
  maturity: rawMaturity,
  readiness: rawReadiness,
  policy: rawPolicy,
  dependencies: rawDeps,
  promotion: rawPromotion,
  incident_drills: rawDrills,
  field_mode: rawField
};

for (const [key, value] of Object.entries(sourcesMap)) {
  signals.meta.sources[key] = value ? 'LOADED' : 'MISSING';
}

const outputPath = path.join(outputDir, 'signals.json');
fs.writeFileSync(outputPath, JSON.stringify(signals, null, 2));
console.log(`Signals collected to ${outputPath}`);
