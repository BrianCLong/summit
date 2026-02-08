import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const createTempDir = async () =>
  fs.mkdtemp(path.join(os.tmpdir(), 'repoflow-'));

export const initGitRepo = async (dir: string) => {
  await execFileAsync('git', ['init'], { cwd: dir });
  await execFileAsync('git', ['config', 'user.email', 'repoflow@example.com'], {
    cwd: dir,
  });
  await execFileAsync('git', ['config', 'user.name', 'RepoFlow'], { cwd: dir });
  await fs.writeFile(path.join(dir, 'README.md'), '# RepoFlow\n', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: dir });
  await execFileAsync('git', ['commit', '-m', 'init'], { cwd: dir });
};
