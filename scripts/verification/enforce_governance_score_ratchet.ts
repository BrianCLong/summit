import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Types
interface GovernanceScore {
  score_total: number;
  grade: string;
  reasons?: Array<{ code: string; message: string }>;
  components: Record<string, any>;
}

interface RatchetPolicy {
  enforcement_scopes: {
    ga_tags: { enforce: boolean };
    rc_tags: { enforce: boolean };
    scheduled_compliance: { enforce: boolean };
  };
  tolerance_rules: {
    allowed_drop_points: number;
    allowed_drop_components: string[];
  };
  mandatory_conditions: {
    hard_fail_reason_codes: string[];
  };
  override_requirements: {
    decision_log_type: string;
    max_ttl_hours: number;
    allowed_override_reason_codes: string[];
  };
}

interface Baseline {
  baseline_score_total: number;
  baseline_grade: string;
  baseline_hash_pointer: string;
  baseline_source: string;
}

interface DecisionOutput {
  decision: 'PASS' | 'FAIL' | 'PASS_WITH_OVERRIDE';
  current_score: number;
  baseline_score: number;
  delta: number;
  triggered_rules: Array<{ code: string; message: string; remediation: string }>;
  override?: {
    present: boolean;
    bundle_id?: string;
    expires_at?: string;
    decision_id?: string;
  };
}

// Paths
const DIST_COMPLIANCE = 'dist/compliance';
const GOVERNANCE_SCORE_PATH = path.join(DIST_COMPLIANCE, 'governance-score.json');
const BASELINE_PATH = path.join(DIST_COMPLIANCE, 'governance-score-baseline.json');
const RATCHET_POLICY_PATH = 'ci/governance-score-ratchet.yml';
const OUTPUT_DECISION_PATH = path.join(DIST_COMPLIANCE, 'governance-score-ratchet-decision.json');

// Assume optional Change Control Bundle path might be provided as ARG or Env Var
// For now, we simulate checking an override if provided.
const OVERRIDE_BUNDLE_PATH = process.env.OVERRIDE_BUNDLE_PATH;

function loadJson<T>(filepath: string): T | null {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${filepath}: ${e}`);
    return null;
  }
}

function enforceRatchet() {
  console.log('Enforcing Governance Score Ratchet...');

  // 1. Load Inputs
  const current = loadJson<GovernanceScore>(GOVERNANCE_SCORE_PATH);
  const baseline = loadJson<Baseline>(BASELINE_PATH);
  const policy = yaml.load(fs.readFileSync(RATCHET_POLICY_PATH, 'utf8')) as RatchetPolicy;

  if (!current) {
    console.error(`ERROR: Current governance score not found at ${GOVERNANCE_SCORE_PATH}`);
    process.exit(1);
  }

  // Handle missing baseline according to policy logic
  // If baseline is missing, the 'resolve' script outputs a special object with -1.
  const baselineScore = baseline?.baseline_score_total ?? -1;
  const isBaselineMissing = baselineScore === -1;

  const currentScore = current.score_total;
  const delta = isBaselineMissing ? 0 : currentScore - baselineScore; // If baseline missing, delta is 0 (or undefined)

  const triggeredRules: DecisionOutput['triggered_rules'] = [];

  // 2. Evaluate Rules

  // Rule A: Score Drop
  const allowedDrop = policy.tolerance_rules.allowed_drop_points;
  if (!isBaselineMissing && delta < -allowedDrop) {
    triggeredRules.push({
      code: 'SCORE_RATCHET_DROP',
      message: `Score dropped by ${Math.abs(delta)} points (allowed: ${allowedDrop}). Current: ${currentScore}, Baseline: ${baselineScore}.`,
      remediation: 'Improve governance score or obtain a break-glass override.'
    });
  }

  // Rule B: Hard Fail Reason Codes
  const currentReasonCodes = current.reasons?.map(r => r.code) || [];
  for (const code of policy.mandatory_conditions.hard_fail_reason_codes) {
    if (currentReasonCodes.includes(code)) {
      triggeredRules.push({
        code: `HARD_FAIL_${code}`,
        message: `Mandatory condition failed: ${code} is present in governance score.`,
        remediation: 'Fix the underlying compliance issue. Overrides may not be allowed for this code.'
      });
    }
  }

  // Rule C: Baseline Missing
  // If baseline is missing, we might fail or warn.
  // The policy doesn't explicitly say "fail on missing baseline" but it's implied by "Ratchet".
  // However, for first run, it might be weird.
  // We'll treat missing baseline as a warning unless configured otherwise, or strict fail.
  // For now, let's trigger a rule if baseline is completely missing/invalid.
  if (isBaselineMissing) {
    triggeredRules.push({
      code: 'BASELINE_MISSING',
      message: 'No valid baseline found. Cannot verify ratchet.',
      remediation: 'Ensure baseline is established (e.g. via lockfile or previous artifact).'
    });
  }

  // 3. Determine Decision
  let decision: DecisionOutput['decision'] = triggeredRules.length === 0 ? 'PASS' : 'FAIL';
  let overrideDetails: DecisionOutput['override'] = undefined;

  // 4. Check Override (if FAIL)
  if (decision === 'FAIL' && OVERRIDE_BUNDLE_PATH) {
    // Validate override
    // This is a stub for full verification of the bundle
    console.log(`Checking override bundle at ${OVERRIDE_BUNDLE_PATH}...`);
    if (fs.existsSync(OVERRIDE_BUNDLE_PATH)) {
      // Logic to verify bundle contents, signature, expiry, reason codes...
      // Simulating a valid override for now if file exists
      const bundle = loadJson<any>(OVERRIDE_BUNDLE_PATH);
      // Check if override reasons cover the triggered rules
      // For this implementation, we assume if bundle exists and is valid, it covers "SCORE_RATCHET_DROP".
      // But maybe not "HARD_FAIL".

      const canOverride = triggeredRules.every(rule => {
        // Check if rule code is allowed to be overridden
        // Logic: specific codes map to override allowed list
        // policy.override_requirements.allowed_override_reason_codes
        return policy.override_requirements.allowed_override_reason_codes.includes(rule.code);
      });

      if (canOverride) {
        decision = 'PASS_WITH_OVERRIDE';
        overrideDetails = {
          present: true,
          bundle_id: bundle?.id || 'unknown',
          expires_at: bundle?.expires_at,
          decision_id: bundle?.decision_id
        };
      } else {
        console.warn('Override provided but does not cover all triggered rules (e.g. HARD_FAIL).');
      }
    }
  }

  // 5. Output Decision
  const result: DecisionOutput = {
    decision,
    current_score: currentScore,
    baseline_score: baselineScore,
    delta,
    triggered_rules: triggeredRules,
    override: overrideDetails
  };

  fs.writeFileSync(OUTPUT_DECISION_PATH, JSON.stringify(result, null, 2));
  console.log(`Ratchet decision: ${decision}`);
  console.log(`Details written to ${OUTPUT_DECISION_PATH}`);

  if (decision === 'FAIL') {
    process.exit(1);
  }
}

enforceRatchet();
