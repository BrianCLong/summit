import fs from 'fs/promises';
import path from 'path';
import { writeEvidenceBundle } from '../../src/agents/evidence/writeEvidence';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, 'temp_evidence_test');

async function runTest() {
  console.log('Starting Evidence System Test...');

  try {
    // Setup
    await fs.mkdir(TEST_DIR, { recursive: true });

    const runId = 'test-run-123';
    const itemSlug = 'TEST-SLUG';
    const evidenceIds = ['EVD-TEST-001'];

    await writeEvidenceBundle({
      runId,
      itemSlug,
      evidenceIds,
      summary: 'Test summary',
      counters: { tests: 1 },
      timings: { total: 100 },
      quality: { confidence: 0.9 },
      rootDir: TEST_DIR
    });

    // Check directory structure
    const evidenceDir = path.join(TEST_DIR, 'evidence', runId);

    // Verify files exist
    const reportPath = path.join(evidenceDir, 'report.json');
    const metricsPath = path.join(evidenceDir, 'metrics.json');
    const stampPath = path.join(evidenceDir, 'stamp.json');

    const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
    if (report.run_id !== runId) throw new Error('Report run_id mismatch');
    if (report.summary !== 'Test summary') throw new Error('Report summary mismatch');
    if (JSON.stringify(report.evidence_ids) !== JSON.stringify(evidenceIds)) throw new Error('Report evidence_ids mismatch');

    const metrics = JSON.parse(await fs.readFile(metricsPath, 'utf-8'));
    if (metrics.counters.tests !== 1) throw new Error('Metrics counter mismatch');

    const stamp = JSON.parse(await fs.readFile(stampPath, 'utf-8'));
    if (!stamp.created_at) throw new Error('Stamp created_at missing');
    if (!stamp.generated_at) throw new Error('Stamp generated_at missing');

    // Check index
    const indexPath = path.join(TEST_DIR, 'evidence', 'index.json');
    const index = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

    if (index.items['EVD-TEST-001']) {
        console.log('✅ Index items found');
    } else {
        throw new Error('Index items missing');
    }

    if (index.entries.length !== 1) throw new Error('Index entries length mismatch');
    if (index.entries[0].evidence_id !== 'EVD-TEST-001') throw new Error('Index evidence_id mismatch');

    console.log('✅ Evidence System Test Passed');
  } catch (error) {
    console.error('❌ Evidence System Test Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  }
}

runTest();
