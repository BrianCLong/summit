import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const runGit = async (args: string[], cwd: string) => {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.toString().trim();
};

export const createBranch = async (repoDir: string, slug: string) => {
  const branchName = `summit/agent/${slug}`;
  await runGit(['checkout', '-b', branchName], repoDir);
  return branchName;
};

export const ensureCleanWorkingTree = async (repoDir: string) => {
  const status = await runGit(['status', '--porcelain'], repoDir);
  if (status.length > 0) {
    throw new Error('Working tree is not clean');
  }
};

export const commitAll = async (
  repoDir: string,
  message: string,
): Promise<string> => {
  await runGit(['add', '.'], repoDir);
  await runGit(['commit', '-m', message], repoDir);
  const sha = await runGit(['rev-parse', 'HEAD'], repoDir);
  return sha;
};

export const currentBranch = async (repoDir: string) =>
  runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir);

export const headSha = async (repoDir: string) =>
  runGit(['rev-parse', 'HEAD'], repoDir);

export type PullRequestSimulator = {
  openPullRequest: (input: {
    repoDir: string;
    branchName: string;
    title: string;
    body: string;
  }) => Promise<void>;
};

export const defaultPrSimulator: PullRequestSimulator = {
  openPullRequest: async () => undefined,
};
