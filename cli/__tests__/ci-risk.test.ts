import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assessCiRisk } from '../src/lib/ci-risk.js';

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
}

describe('assessCiRisk', () => {
  it('computes risk metrics from repository activity', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-risk-'));
    const repoPath = path.join(tempRoot, 'repo');
    fs.mkdirSync(repoPath);

    try {
      git(repoPath, 'init');
      git(repoPath, 'config', 'user.email', 'ci-risk@example.com');
      git(repoPath, 'config', 'user.name', 'CI Risk Bot');

      fs.mkdirSync(path.join(repoPath, 'networking'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'storage'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'scheduler'), { recursive: true });

      fs.writeFileSync(path.join(repoPath, 'networking', 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(repoPath, 'storage', 'a.ts'), 'export const s = 1;');
      git(repoPath, 'add', '.');
      git(repoPath, 'commit', '-m', 'feat: baseline networking and storage');

      fs.writeFileSync(path.join(repoPath, 'networking', 'a.ts'), 'export const a = 2;');
      fs.writeFileSync(path.join(repoPath, 'scheduler', 'planner.ts'), 'export const plan = true;');
      git(repoPath, 'add', '.');
      git(repoPath, 'commit', '-m', 'merge: resolve conflict in scheduler integration');

      const assessment = assessCiRisk(repoPath);

      expect(assessment.commitsAnalyzed).toBeGreaterThan(1);
      expect(assessment.prsAnalyzed).toBeGreaterThan(0);
      expect(assessment.drivers).toHaveLength(4);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(1);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
