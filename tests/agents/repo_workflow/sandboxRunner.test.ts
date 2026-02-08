import { runSandboxCommand } from '../../../src/agents/repoFlow/sandboxRunner';

describe('runSandboxCommand', () => {
  it('runs a command in the sandbox profile', async () => {
    const result = await runSandboxCommand('node', ['-e', 'console.log("ok")']);
    expect(result.stdout).toContain('ok');
  });

  it('blocks network-like commands when disabled', async () => {
    await expect(
      runSandboxCommand('curl', ['https://example.com']),
    ).rejects.toThrow('Network disabled');
  });
});
