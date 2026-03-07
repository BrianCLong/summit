import { describe, it, expect } from 'vitest';
import { SandboxSupervisor } from '../../apps/sandbox-supervisor/index';

describe('Sandbox Supervisor', () => {
  it('throws on insufficient budget', async () => {
    const supervisor = new SandboxSupervisor();
    await expect(supervisor.execute(
      { id: 't1', kind: 'code', deps: [], evidenceRequired: [], budgetClass: 'l' },
      { repoSnapshot: 'snap_1', networkEnabled: false, maxMemoryMB: 256 }
    )).rejects.toThrow('Insufficient budget');
  });

  it('succeeds on sufficient budget', async () => {
    const supervisor = new SandboxSupervisor();
    await expect(supervisor.execute(
      { id: 't1', kind: 'code', deps: [], evidenceRequired: [], budgetClass: 's' },
      { repoSnapshot: 'snap_1', networkEnabled: false, maxMemoryMB: 256 }
    )).resolves.not.toThrow();
  });
});
