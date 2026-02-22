import * as fs from 'fs';
import * as path from 'path';
import { scoreSeeding } from './30_score_seeding.js'; // Removed .ts extension
import { scoreHandoff } from './31_score_handoff.js'; // Removed .ts extension
import { scoreCompression } from './32_score_compression.js'; // Removed .ts extension
import { deriveState } from './40_state_machine.js'; // Removed .ts extension

// Mock run ID
const RUN_ID = 'RUN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');

async function runFixture() {
  console.log('Running Narrative CI Pipeline (Fixture Mode)...');

  // Output directories
  const outDir = 'out';
  const evidenceDir = 'evidence';

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  if (!fs.existsSync(path.join(outDir, 'narratives'))) fs.mkdirSync(path.join(outDir, 'narratives'), { recursive: true });
  if (!fs.existsSync(path.join(outDir, 'metrics'))) fs.mkdirSync(path.join(outDir, 'metrics'), { recursive: true });

  // 1. Generate Fake Narratives
  const narrativeId = 'NARRATIVE-CI-DEMO-001';

  // 2. Score
  const seeding = await scoreSeeding(narrativeId, []);
  const handoff = await scoreHandoff(narrativeId, []);
  const compression = await scoreCompression(narrativeId, []);

  // 3. State
  const state = deriveState({ seeding, handoff, compression });

  // 4. Write Deterministic Outputs
  const metrics = {
    run_id: RUN_ID,
    metrics: {
      resilience_score: 0.5,
      seeding_density: seeding,
      handoff_score: handoff,
      compression_ratio: compression
    }
  };

  fs.writeFileSync(path.join(outDir, 'metrics', 'seeding_density.json'), JSON.stringify(metrics, null, 2));

  // 5. Bundle Evidence
  const report = {
    evidence_id: 'EVD-NARRATIVE-CI-METRICS-001',
    summary: 'Narrative CI Pipeline Run',
    details: {
      narrative_id: narrativeId,
      state: state,
      scores: { seeding, handoff, compression }
    },
    policy_version: '1.0'
  };

  const evidencePath = path.join(evidenceDir, report.evidence_id);
  if (!fs.existsSync(evidencePath)) fs.mkdirSync(evidencePath, { recursive: true });

  fs.writeFileSync(path.join(evidencePath, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(evidencePath, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(evidencePath, 'stamp.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

  console.log('Evidence bundle created at ' + evidencePath);
}

// CLI check
if (process.argv.includes('--fixture')) {
  runFixture().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
