import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface EvidenceConfig {
  evidence_id: string; // e.g., EVD-SITUPDATE-2026-02-07-DELTA-001
  summary: string;
  details: any; // The main payload (delta, handoff, state)
  metrics?: any;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: tsx 50_bundle_evidence.ts <payload_path> <evidence_id> <output_dir>');
    process.exit(1);
  }

  const [payloadPath, evidenceId, outputDir] = args;

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

  // Construct evidence bundle
  const bundleDir = path.join(outputDir, evidenceId);
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  // Split payload into deterministic report and timestamped stamp
  const report = {
    evidence_id: evidenceId,
    summary: `Narrative CI Output for ${evidenceId}`,
    details: payload,
    policy_version: '1.0.0' // Mock version
  };

  const stamp = {
    generated_at: new Date().toISOString(),
    runner: 'narrative-ci',
    input_hash: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  };

  const metrics = payload.metrics || {
    claims_count: payload.new_claims?.length || 0,
    artifacts_count: payload.new_artifacts?.length || 0
  };

  fs.writeFileSync(path.join(bundleDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(bundleDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(bundleDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Update index.json
  const indexFile = path.join(outputDir, 'index.json');
  let index = {};
  if (fs.existsSync(indexFile)) {
    index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  }

  index[evidenceId] = {
    path: `${evidenceId}/report.json`,
    timestamp: stamp.generated_at
  };

  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  console.log(`Evidence bundle created at ${bundleDir}`);
}

main().catch(console.error);
