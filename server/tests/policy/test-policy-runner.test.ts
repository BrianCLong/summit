describe('runCommandCheck', () => {
  test('reports success for passing commands', () => {
    const { runCommandCheck } = require('../../../scripts/ci/test-policy-runner.cjs');
    const result = runCommandCheck({
      name: 'echo-command',
      command: "node -e \"console.log('ok')\"",
      description: 'Test command',
      remediation: 'N/A'
    });
    expect(result.passed).toBe(true);
    expect(result.details[0]).toContain('succeeded');
  });

  test('captures stderr for failing commands', () => {
    const { runCommandCheck } = require('../../../scripts/ci/test-policy-runner.cjs');
    const result = runCommandCheck({
      name: 'failing-command',
      command: "node -e \"process.stderr.write('boom'); process.exit(1)\"",
      description: 'Test command',
      remediation: 'Investigate failure'
    });
    expect(result.passed).toBe(false);
    expect(result.details[0]).toContain('boom');
  });
});
