import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const RATCHET_POLICY_PATH = 'ci/governance-score-ratchet.yml';

interface RatchetPolicy {
  enforcement_scopes: {
    ga_tags: { enforce: boolean };
    rc_tags: { enforce: boolean };
    scheduled_compliance: { enforce: boolean };
  };
  baseline_strategy: {
    mode: string;
    lockfile_path: string;
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

function validatePolicy() {
  if (!fs.existsSync(RATCHET_POLICY_PATH)) {
    console.error(`ERROR: Ratchet policy not found at ${RATCHET_POLICY_PATH}`);
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(RATCHET_POLICY_PATH, 'utf8');
    const policy = yaml.load(fileContent) as RatchetPolicy;

    // Schema validation (basic)
    if (!policy.enforcement_scopes || typeof policy.enforcement_scopes.ga_tags.enforce !== 'boolean') {
      throw new Error('Invalid enforcement_scopes structure');
    }
    if (policy.baseline_strategy.mode !== 'lockfile') {
       // Warn if using a strategy other than lockfile, as we implemented lockfile support
       console.warn(`WARNING: baseline_strategy.mode is '${policy.baseline_strategy.mode}'. Ensure implementation supports it.`);
    }
    if (typeof policy.tolerance_rules.allowed_drop_points !== 'number') {
      throw new Error('Invalid tolerance_rules.allowed_drop_points');
    }

    console.log(`SUCCESS: Ratchet policy at ${RATCHET_POLICY_PATH} is valid.`);
  } catch (error: any) {
    console.error(`ERROR: Failed to validate ratchet policy: ${error.message}`);
    process.exit(1);
  }
}

validatePolicy();
