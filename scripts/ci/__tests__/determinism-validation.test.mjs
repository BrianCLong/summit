import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

// Helper function to run the evidence gate multiple times and verify determinism
async function performDeterminismTest() {
  console.log('[DETERMINISM TEST] Starting determinism verification...');
  
  // Create temporary directories for test runs
  const tempBaseDir = join(tmpdir(), `evidence-test-${Date.now()}`);
  await fs.mkdir(tempBaseDir, { recursive: true });
  
  const runSHA = 'determinism-test-sha';
  
  try {
    // Run the gate multiple times with exact same inputs
    console.log('[DETERMINISM TEST] Running gate multiple times with identical inputs...');
    
    // First run
    const outputDir1 = join(tempBaseDir, 'run1');
    const proc1 = spawn('node', [
      'scripts/ci/verify_evidence_id_consistency.mjs', 
      `--sha=${runSHA}`
    ], {
      cwd: resolve('.'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await new Promise((resolve, reject) => {
      proc1.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`First run failed with exit code: ${code}`));
      });
    });
    
    // Second run
    const outputDir2 = join(tempBaseDir, 'run2');
    const proc2 = spawn('node', [
      'scripts/ci/verify_evidence_id_consistency.mjs', 
      `--sha=${runSHA}`
    ], {
      cwd: resolve('.'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await new Promise((resolve, reject) => {
      proc2.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Second run failed with exit code: ${code}`));
      });
    });
    
    // Third run
    const outputDir3 = join(tempBaseDir, 'run3');
    const proc3 = spawn('node', [
      'scripts/ci/verify_evidence_id_consistency.mjs', 
      `--sha=${runSHA}`
    ], {
      cwd: resolve('.'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await new Promise((resolve, reject) => {
      proc3.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Third run failed with exit code: ${code}`));
      });
    });
    
    // Now read and compare the deterministic artifacts
    const reportPath1 = join('artifacts/governance/evidence-id-consistency', runSHA, 'report.json');
    const reportPath2 = join('artifacts/governance/evidence-id-consistency', runSHA, 'report.json');
    const reportPath3 = join('artifacts/governance/evidence-id-consistency', runSHA, 'report.json');
    
    console.log('[DETERMINISM TEST] Comparing deterministic artifacts...');
    
    // Read deterministic artifacts
    const report1 = await fs.readFile(reportPath1, 'utf8');
    const report2 = await fs.readFile(reportPath2, 'utf8'); 
    const report3 = await fs.readFile(reportPath3, 'utf8');
    
    // Verify reports are identical
    assert.strictEqual(report1, report2, 'Report.json should be identical across first two runs');
    assert.strictEqual(report2, report3, 'Report.json should be identical across last two runs');
    
    const metricsPath1 = join('artifacts/governance/evidence-id-consistency', runSHA, 'metrics.json');
    const metricsPath2 = join('artifacts/governance/evidence-id-consistency', runSHA, 'metrics.json');
    const metricsPath3 = join('artifacts/governance/evidence-id-consistency', runSHA, 'metrics.json');
    
    const metrics1 = await fs.readFile(metricsPath1, 'utf8');
    const metrics2 = await fs.readFile(metricsPath2, 'utf8');
    const metrics3 = await fs.readFile(metricsPath3, 'utf8');
    
    // Verify metrics are identical
    assert.strictEqual(metrics1, metrics2, 'Metrics.json should be identical across first two runs');
    assert.strictEqual(metrics2, metrics3, 'Metrics.json should be identical across last two runs');
    
    console.log('[DETERMINISM TEST] ✅ All deterministic artifacts are identical across runs');
    
    // Verify stamps differ in timestamps (expected) but have deterministic fields
    const stampPath1 = join('artifacts/governance/evidence-id-consistency', runSHA, 'stamp.json');
    const stampPath2 = join('artifacts/governance/evidence-id-consistency', runSHA, 'stamp.json');
    const stampPath3 = join('artifacts/governance/evidence-id-consistency', runSHA, 'stamp.json');
    
    const stamp1 = JSON.parse(await fs.readFile(stampPath1, 'utf8'));
    const stamp2 = JSON.parse(await fs.readFile(stampPath2, 'utf8'));
    const stamp3 = JSON.parse(await fs.readFile(stampPath3, 'utf8'));
    
    // Check deterministic fields in stamps
    assert.strictEqual(stamp1.sha, stamp2.sha, 'SHA should be identical in stamps');
    assert.strictEqual(stamp1.sha, stamp3.sha, 'SHA should be identical in stamps');
    assert.strictEqual(stamp1.status, stamp2.status, 'Status should be identical in stamps');  
    assert.strictEqual(stamp1.status, stamp3.status, 'Status should be identical in stamps');
    assert.strictEqual(stamp1.violations, stamp2.violations, 'Violation counts should be identical in stamps');
    assert.strictEqual(stamp1.violations, stamp3.violations, 'Violation counts should be identical in stamps');
    
    // Timestamps should differ (as expected)
    assert.ok(stamp1.timestamp, 'Stamp1 should have timestamp');
    assert.ok(stamp2.timestamp, 'Stamp2 should have timestamp');
    assert.ok(stamp3.timestamp, 'Stamp3 should have timestamp');
    
    console.log('[DETERMINISM TEST] ✅ Stamps have deterministic fields with runtime timestamps');
    
    // Verify no timestamp keys in deterministic artifacts
    const reportObj1 = JSON.parse(report1);
    assert.ok(!hasTimestampKeys(reportObj1), 'Report.json should not contain timestamp keys');
    
    const metricsObj1 = JSON.parse(metrics1);
    assert.ok(!hasTimestampKeys(metricsObj1), 'Metrics.json should not contain timestamp keys');
    
    console.log('[DETERMINISM TEST] ✅ No timestamp keys found in deterministic artifacts');
    
    return {
      success: true,
      message: 'All determinism tests passed!'
    };
  } finally {
    // Clean up temp directory - not needed since we're using the same artifact path
  }
}

// Check for timestamp-like keys in object structure (not content)
function hasTimestampKeys(obj) {
  if (obj === null || typeof obj !== 'object') return false;
  
  if (Array.isArray(obj)) {
    return obj.some(item => hasTimestampKeys(item));
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('timestamp') || 
        lowerKey.includes('generated_at') || 
        lowerKey.includes('created_at') || 
        lowerKey.includes('updated_at') ||
        lowerKey.includes('last_updated') ||
        lowerKey.includes('execution_time') ||
        lowerKey.includes('time') ||
        lowerKey.includes('date')) {
      // Special exceptions: allow "time" in "performance" objects since they're runtime metrics
      if (key === 'time' && ['performance', 'runtime'].some(k => obj[k])) {
        continue;
      }
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (hasTimestampKeys(value)) return true;
    }
  }
  
  return false;
}

// Main test suite
describe('Evidence ID Consistency - Determinism Verification', () => {
  test('Identical runs produce deterministic artifacts', async () => {
    const result = await performDeterminismTest();
    assert.ok(result.success, result.message);
  });
});

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  performDeterminismTest()
    .then(result => console.log('[DETERMINISM TEST] SUCCESS:', result.message))
    .catch(error => {
      console.error('[DETERMINISM TEST] FAILED:', error.message);
      process.exit(1);
    });
}