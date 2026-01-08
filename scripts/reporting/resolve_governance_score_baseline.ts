import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';

// Types
interface GovernanceScore {
  score_total: number;
  grade: string;
  reason_codes: string[];
  components: Record<string, any>;
}

interface RatchetPolicy {
  baseline_strategy: {
    mode: string;
    lockfile_path: string;
  };
}

interface BaselineOutput {
  baseline_score_total: number;
  baseline_grade: string;
  baseline_hash_pointer: string;
  baseline_source: string;
}

const RATCHET_POLICY_PATH = 'ci/governance-score-ratchet.yml';
const OUTPUT_DIR = 'dist/compliance';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'governance-score-baseline.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function resolveBaseline() {
  console.log('Resolving Governance Score Baseline...');

  // 1. Load Policy
  if (!fs.existsSync(RATCHET_POLICY_PATH)) {
    console.error(`ERROR: Policy not found at ${RATCHET_POLICY_PATH}`);
    process.exit(1);
  }
  const policy = yaml.load(fs.readFileSync(RATCHET_POLICY_PATH, 'utf8')) as RatchetPolicy;
  const strategy = policy.baseline_strategy;

  let baseline: BaselineOutput | null = null;

  // 2. Resolve based on strategy
  if (strategy.mode === 'lockfile') {
    const lockfilePath = strategy.lockfile_path;
    if (fs.existsSync(lockfilePath)) {
      console.log(`Using lockfile strategy: reading ${lockfilePath}`);
      try {
        const lockContent = fs.readFileSync(lockfilePath, 'utf8');
        baseline = JSON.parse(lockContent);
      } catch (e) {
        console.error(`ERROR: Failed to parse lockfile: ${e}`);
        // We will fail if lockfile is corrupted, but if missing we might handle it.
        // Actually, for a ratchet, if baseline is missing, maybe we initialize?
        // But the requirements say "if baseline missing, produce reason code BASELINE_MISSING and follow policy".
        // The script needs to output a valid JSON anyway, perhaps with error codes.
      }
    } else {
      console.warn(`WARNING: Baseline lockfile not found at ${lockfilePath}`);
    }
  } else {
    console.error(`ERROR: Unsupported baseline strategy: ${strategy.mode}`);
    // Option A implementation would go here (fetch artifact)
  }

  // 3. Construct Output
  if (!baseline) {
    // Fallback if missing
    console.log('Baseline not found or invalid. Outputting empty baseline with appropriate flags.');
    // We don't have a specific "error" field in the output schema requested,
    // but the next script (enforcement) needs to handle missing baseline.
    // We'll output a minimal object or one indicating missing data.
    // The requirement says: "if baseline missing, produce reason code BASELINE_MISSING and follow policy".
    // This implies the *enforcement* script produces the reason code.
    // This resolution script just tries to find it.
    // We will output a file that indicates "no baseline".
    // Let's use -1 or null to indicate missing.
    baseline = {
      baseline_score_total: -1,
      baseline_grade: 'UNKNOWN',
      baseline_hash_pointer: 'NONE',
      baseline_source: 'MISSING'
    };
  }

  // 4. Write Output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(baseline, null, 2));
  console.log(`Baseline resolved and written to ${OUTPUT_FILE}`);
}

resolveBaseline();
