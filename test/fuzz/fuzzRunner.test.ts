import fs from 'node:fs';
import path from 'node:path';
import { runFuzzTargets } from '../../tooling/fuzz/fuzzRunner';

describe('fuzz harness', () => {
  const artifactRoot = path.join(process.cwd(), 'artifacts', 'fuzz');

  afterEach(() => {
    if (fs.existsSync(artifactRoot)) {
      for (const file of fs.readdirSync(artifactRoot)) {
        fs.unlinkSync(path.join(artifactRoot, file));
      }
    }
  });

  it('captures crashes and persists artifacts deterministically', async () => {
    const seeds = ['safe', 'boom'];
    const targets = [
      {
        name: 'dummy-parser',
        seeds,
        iterations: 5,
        timeoutMs: 10,
        handler: (input: string) => {
          if (input.includes('boom')) {
            throw new Error('intentional crash');
          }
        },
      },
    ];

    const results = await runFuzzTargets(targets, 7);
    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result.failures.length).toBeGreaterThanOrEqual(1);
    const failure = result.failures[0];
    expect(fs.existsSync(failure.artifactPath)).toBe(true);
    const persisted = fs.readFileSync(failure.artifactPath, 'utf8');
    expect(persisted.includes('boom')).toBe(true);
    expect(failure.inputSample).toContain('boom');
    expect(failure.seed).toBe(7);
    expect(failure.artifactPath).toContain('seed-7');
  });

  it('halts handlers that hang', async () => {
    const targets = [
      {
        name: 'hang-prone',
        seeds: ['idle'],
        iterations: 1,
        timeoutMs: 5,
        handler: async () => new Promise((resolve) => setTimeout(resolve, 20)),
      },
    ];

    const results = await runFuzzTargets(targets, 1);
    expect(results[0].failures).toHaveLength(1);
    expect(results[0].failures[0].error).toContain('Timeout');
  });
});
