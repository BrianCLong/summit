import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const enforceCommitments = () => {
  try {
    const policyPath = 'ci/governance-okrs.yml';
    const policy = yaml.load(fs.readFileSync(policyPath, 'utf8')) as any;
    const quarterId = policy.quarter_id;
    const okrStatusPath = `dist/okrs/${quarterId}/okr-status.json`;

    if (!fs.existsSync(okrStatusPath)) {
      console.error(`OKR Status file not found: ${okrStatusPath}`);
      // Fail closed if we are enforcing, otherwise just warn
      process.exit(process.argv.includes('--enforce') ? 1 : 0);
    }

    const currentStatus = JSON.parse(fs.readFileSync(okrStatusPath, 'utf8'));
    let hasFailures = false;

    console.log('Verifying Governance OKR Commitments...');

    currentStatus.results.forEach((r: any) => {
        if (r.hard_fail && r.status === 'OFF_TRACK') {
            console.error(`❌ HARD FAIL: Metric ${r.metric_id} is OFF_TRACK (Current: ${r.current_value}, Target: ${r.direction} ${r.target})`);
            hasFailures = true;
        } else if (r.status === 'OFF_TRACK') {
            console.warn(`⚠️ Warning: Metric ${r.metric_id} is OFF_TRACK`);
        }
    });

    if (hasFailures) {
        if (process.argv.includes('--enforce')) {
            console.error('FAILED: One or more hard-fail commitments were not met.');
            process.exit(1);
        } else {
            console.log('Enforcement disabled. Proceeding despite failures.');
        }
    } else {
        console.log('✅ All hard-fail commitments met.');
    }

  } catch (e) {
    console.error('Enforcement check failed:', e);
    process.exit(1);
  }
};

enforceCommitments();
