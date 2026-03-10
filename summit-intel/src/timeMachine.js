import { execSync } from 'node:child_process';

export function analyzeHistory(repoPath, limit = 50) {
  const format = ['%H', '%cI', '%an', '%s'].join('\u001f');
  const log = execSync(`git log --pretty=format:${format} -n ${limit}`, {
    cwd: repoPath,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .toString()
    .trim();

  if (!log) {
    return [];
  }

  return log.split('\n').map((line) => {
    const [commit, timestamp, author, subject] = line.split('\u001f');
    return { commit, timestamp, author, subject };
  });
}
