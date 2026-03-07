import { describe, it, expect, vi } from 'vitest';
import { runCommand } from '../../cli/summit-agent/commands/run';

describe('Summit Run Command', () => {
  it('handles issue run', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    runCommand('issue', '42');
    expect(logSpy).toHaveBeenCalledWith('Executing graph-42...');
    logSpy.mockRestore();
  });

  it('handles workflow run', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    runCommand('workflow', 'test.yaml');
    expect(logSpy).toHaveBeenCalledWith('Executing workflow test.yaml...');
    logSpy.mockRestore();
  });

  it('throws on unknown run', () => {
    expect(() => runCommand('unknown', 'xyz')).toThrow('Unknown target type: unknown');
  });
});
