const { spawnSync, execSync } = require('child_process');

function hasBinary(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

describe('Conftest policy verification', () => {
  test('validates RBAC and clearance policies with Conftest or OPA CLI', () => {
    if (hasBinary('conftest --version')) {
      const result = spawnSync('conftest', ['verify', '--policy', 'policy', '--tests', 'tests/opa'], {
        encoding: 'utf-8'
      });

      if (result.error) {
        throw result.error;
      }

      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/PASS/i);
      return;
    }

    if (hasBinary('opa version')) {
      const result = spawnSync('opa', ['test', 'policy', 'tests/opa', '--format', 'json'], {
        encoding: 'utf-8'
      });

      if (result.error) {
        throw result.error;
      }

      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/"pass":true/);
      return;
    }

    console.warn('⚠️  Conftest and OPA CLIs not available; skipping policy verification.');
  });
});
