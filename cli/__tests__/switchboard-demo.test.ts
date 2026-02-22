/**
 * Switchboard Demo Command Smoke Test
 */

import { Command } from 'commander';
import { registerSwitchboardCommands } from '../src/commands/switchboard.js';

describe('Switchboard demo command', () => {
  it('runs and emits ordered demo markers', async () => {
    const lines: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });

    const program = new Command();
    registerSwitchboardCommands(program);
    await expect(program.parseAsync(['switchboard', 'demo'], { from: 'user' })).resolves.toBeUndefined();

    logSpy.mockRestore();

    const output = lines.join('\n');
    const markers = ['REGISTRY PASS', 'POLICY DENY', 'POLICY ALLOW', 'RECEIPT WRITTEN'];
    const indexes = markers.map((marker) => output.indexOf(marker));

    for (const index of indexes) {
      expect(index).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < indexes.length; i += 1) {
      expect(indexes[i]).toBeGreaterThan(indexes[i - 1]);
    }
  });
});
