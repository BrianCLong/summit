import { evaluateAIGrounding, UpgradeRec } from '../src/gates/ai_grounding.js';
import assert from 'assert';

async function test() {
  console.log('Running manual verification for AI Grounding Gate logic...');

  const recs: UpgradeRec[] = [
    { name: 'test-pkg', version: '1.0.0', ecosystem: 'npm' }
  ];

  // Test Pass Case
  const res1 = await evaluateAIGrounding(recs, async () => true);
  assert.strictEqual(res1.ok, true, 'Should pass when resolver returns true');
  assert.strictEqual(res1.findings.length, 0, 'Should have no findings');
  console.log('✅ PASS case verified');

  // Test Fail Case
  const res2 = await evaluateAIGrounding(recs, async () => false);
  assert.strictEqual(res2.ok, false, 'Should fail when resolver returns false');
  assert.ok(res2.findings[0].includes('Unresolvable'), 'Should report unresolvable recommendation');
  console.log('✅ FAIL case verified');
}

test().catch(e => {
  console.error('❌ Verification Failed:', e);
  process.exit(1);
});
