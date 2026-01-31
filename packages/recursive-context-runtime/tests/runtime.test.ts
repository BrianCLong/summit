import { FSRepoAdapter } from '../src/env/adapters/fsRepo';
import { RCRSession } from '../src/runtime/session';
import { RecursionBudget } from '../src/api';
import * as path from 'path';

describe('RCR Runtime', () => {
  // Use the package directory itself as the repo root for testing
  const testRepoPath = path.resolve(__dirname, '..');
  const adapter = new FSRepoAdapter(testRepoPath, 'test-handle');
  const budget: RecursionBudget = {
    maxDepth: 1,
    maxIterations: 10,
    maxSubcalls: 10,
    maxWallMs: 10000,
    maxCostUsd: 1.0
  };

  it('should list files', async () => {
    const session = new RCRSession(adapter, budget);
    const files = await session.listFiles();
    expect(files).toContain('package.json');
    expect(session.getTrace().length).toBeGreaterThan(0);
  });

  it('should read a file', async () => {
    const session = new RCRSession(adapter, budget);
    const result = await session.readFile('package.json');
    expect(result.text).toContain('"name": "@maestro/recursive-context-runtime"');
    expect(result.span.sha256).toBeDefined();
  });

  it('should search text', async () => {
    const session = new RCRSession(adapter, budget);
    const hits = await session.searchText('"name": "@maestro/recursive-context-runtime"');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].span.path).toContain('package.json');
  });
});
