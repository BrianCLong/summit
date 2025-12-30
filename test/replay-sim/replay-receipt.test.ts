import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Helper to run the tool via tsx
// Since npx tsx can be slow, we increase test timeout.
const runTool = async (args: string) => {
  const command = `npx tsx ${path.resolve(__dirname, '../../tools/replay-receipt.ts')} ${args}`;
  return execAsync(command);
};

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/receipt.json');

describe('Replay Simulator', () => {

  it('should process receipt and dedupe subsequent replay attempts', async () => {
    const { stdout } = await runTool(`--input ${FIXTURE_PATH} --times 5`);
    const result = JSON.parse(stdout);

    expect(result).toEqual({
      times: 5,
      persistedCount: 1,
      dedupedCount: 4,
      errors: []
    });
  }, 20000);

  it('should be deterministic with seed', async () => {
    const { stdout: stdout1 } = await runTool(`--input ${FIXTURE_PATH} --times 3 --seed 42`);
    const result1 = JSON.parse(stdout1);

    const { stdout: stdout2 } = await runTool(`--input ${FIXTURE_PATH} --times 3 --seed 42`);
    const result2 = JSON.parse(stdout2);

    expect(result1).toEqual(result2);
    expect(result1.times).toBe(3);
  }, 20000);

  it('should error if input is missing', async () => {
    try {
      await runTool(`--times 1`);
      throw new Error('Should have failed');
    } catch (error: any) {
      if (error.message === 'Should have failed') throw error;
      expect(error.code).toBe(1);
      const output = (error.stderr || '') + (error.stdout || '');
      expect(output).toContain('error');
    }
  }, 20000);
});
