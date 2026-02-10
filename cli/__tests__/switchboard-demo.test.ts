/**
 * Switchboard Demo Command Test
 */

import * as path from 'path';
import { Command } from 'commander';
import { registerSwitchboardCommands } from '../src/commands/switchboard.js';

describe('Switchboard demo command', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const originalCwd = process.cwd();

  beforeAll(() => {
    process.chdir(repoRoot);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  it('runs the demo and emits ordered markers', async () => {
    const logs: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    const program = new Command();
    registerSwitchboardCommands(program);
    await program.parseAsync(['node', 'test', 'switchboard', 'demo'], { from: 'user' });

    logSpy.mockRestore();

    const output = logs.join('\n');
    const markers = ['REGISTRY PASS', 'POLICY DENY', 'POLICY ALLOW', 'RECEIPT WRITTEN'];
    const positions = markers.map((marker) => output.indexOf(marker));

    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index]).toBeGreaterThan(positions[index - 1]);
    }
  });
});
