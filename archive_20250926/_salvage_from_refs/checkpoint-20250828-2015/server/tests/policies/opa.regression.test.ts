import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

describe('OPA Policy Regression (Conftest)', () => {
  test('should run Conftest against OPA policies without errors', async () => {
    // Assuming conftest is installed and policies are in server/policies/
    const policiesPath = path.resolve(__dirname, '../../policies');
    const command = `conftest test ${policiesPath} --policy ${policiesPath} --all-namespaces`;

    try {
      const { stdout, stderr } = await execPromise(command);
      console.log('Conftest stdout:', stdout);
      if (stderr) {
        console.error('Conftest stderr:', stderr);
      }
      // Assert that conftest exited successfully (exit code 0)
      // and typically, no "FAIL" messages in stdout for a successful regression test
      expect(stderr).toBe('');
      expect(stdout).not.toContain('FAIL');
      expect(stdout).toContain('passed'); // Expect some policies to have passed
    } catch (error: any) {
      console.error('Conftest command failed:', error.message);
      console.error('Conftest stdout on error:', error.stdout);
      console.error('Conftest stderr on error:', error.stderr);
      fail(`Conftest command failed: ${error.message}`);
    }
  }, 60000); // Increase timeout for external command execution
});
