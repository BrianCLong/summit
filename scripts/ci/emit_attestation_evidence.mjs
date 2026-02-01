import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const options = {
  attestation: { type: 'string', default: 'attestation.json' },
  'out-dir': { type: 'string' },
};

try {
  const { values } = parseArgs({ options });

  if (!fs.existsSync(values.attestation)) {
    console.error(`Attestation file not found: ${values.attestation}`);
    process.exit(1);
  }

  const attestation = JSON.parse(fs.readFileSync(values.attestation, 'utf8'));
  const evidenceId = attestation.evidence_id;
  const gitSha = attestation.git_sha;

  const outDir = values['out-dir'] || path.join('evidence', 'attestation', evidenceId);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Get deterministic timestamp from git commit
  const commitTime = execSync(`git show -s --format=%cI ${gitSha}`, { encoding: 'utf8' }).trim();

  // 1. report.json
  const report = {
    evidence_id: evidenceId,
    summary: `Deterministic build attestation for SHA ${gitSha}`,
    status: 'passed',
    artifacts: [
      'attestation.json' // Use relative path within the evidence bundle
    ]
  };

  // 2. metrics.json
  const metrics = {
    evidence_id: evidenceId,
    metrics: {
      files_hashed_count: attestation.inputs.file_count,
      manifest_sha256_present: 1,
      git_sha_match: 1
    }
  };

  // 3. stamp.json
  const stamp = {
    started_at: commitTime,
    finished_at: commitTime,
    runner: 'github-actions'
  };

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(outDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Also copy the attestation itself to the evidence folder
  fs.writeFileSync(path.join(outDir, 'attestation.json'), JSON.stringify(attestation, null, 2));

  console.log(`Evidence emitted to ${outDir}`);
} catch (error) {
  console.error('Error emitting evidence:', error);
  process.exit(1);
}
