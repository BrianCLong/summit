import { checkNPMVersion } from '../src/gates/ai_grounding.js';
import assert from 'assert';

async function test() {
  console.log('Verifying AI Gate Security Fix...');

  // Test injection attempt
  // "version" argument is injected
  const injection = '1.0.0; echo INJECTION_SUCCESS > injection_proof.txt';

  // Ensure file doesn't exist
  // @ts-ignore
  if (import('fs').then(fs => fs.existsSync && fs.existsSync('injection_proof.txt'))) {
      // @ts-ignore
      import('fs').then(fs => fs.unlinkSync('injection_proof.txt'));
  }

  const result = await checkNPMVersion('react', injection);

  assert.strictEqual(result, false, 'Injection attempt should return false');
  console.log('✅ Injection attempt handled safely (returned false)');

  // Check if file was created
  const fs = await import('fs');
  if (fs.existsSync('injection_proof.txt')) {
      console.error('❌ VULNERABILITY: Command injection succeeded! injection_proof.txt created.');
      process.exit(1);
  } else {
      console.log('✅ Proof file not created. No injection.');
  }
}

test().catch(e => {
    console.error(e);
    process.exit(1);
});
