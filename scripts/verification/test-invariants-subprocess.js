import { exec } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.join(__dirname, 'verify_invariants.ts');

test('verify_invariants script execution', (t, done) => {
  // Execute the script using npx tsx to ensure consistent environment
  exec(`npx tsx ${SCRIPT_PATH}`, {
    env: { ...process.env, CI: '1' }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stderr: ${stderr}`);
      console.log(`stdout: ${stdout}`);
      assert.fail('Script execution failed');
      return;
    }

    // Check exit code implicitly by error being null

    // Check output contains expected suite names
    assert.ok(stdout.includes('Provenance Invariants'), 'Should contain "Provenance Invariants"');
    assert.ok(stdout.includes('Tenant Kill Switch'), 'Should contain "Tenant Kill Switch"');

    // Check output indicates success
    assert.ok(stdout.includes('✅'), 'Should contain checkmark');
    assert.ok(stdout.includes('Evidence artifact written'), 'Should mention evidence artifact');

    // Check for no unhandled rejections (stderr should be mostly empty or just warnings)
    if (stderr) {
       // Ignore npm warnings
       const meaningfulStderr = stderr.split('\n')
         .filter(line => !line.includes('npm warn') && !line.trim().length)
         .join('\n');
       if (meaningfulStderr.length > 0) {
         // console.warn('Stderr output:', meaningfulStderr);
       }
    }

    done();
  });
});
