import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  commitAll,
  createBranch,
  currentBranch,
  ensureCleanWorkingTree,
} from '../../../src/agents/repoFlow/gitWriter';
import { createTempDir, initGitRepo } from './helpers';

describe('gitWriter', () => {
  it('creates branch and commits changes', async () => {
    const dir = await createTempDir();
    await initGitRepo(dir);

    await ensureCleanWorkingTree(dir);
    const branch = await createBranch(dir, 'test');

    await fs.writeFile(path.join(dir, 'change.txt'), 'data', 'utf8');
    const sha = await commitAll(dir, 'test commit');

    const current = await currentBranch(dir);

    expect(branch).toBe('summit/agent/test');
    expect(current).toBe(branch);
    expect(sha).toHaveLength(40);
  });
});
