import { execSync } from 'child_process';
import { REPO_ROOT } from '../config.js';

function git(args: string): string {
  try {
    return execSync(`git -C "${REPO_ROOT}" ${args}`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export interface BranchInfo {
  name: string;
  remote: boolean;
  type: 'feature' | 'fix' | 'claude' | 'other';
}

export function getBranches(): BranchInfo[] {
  const raw = git('branch -a');
  return raw
    .split('\n')
    .map((l) => l.replace(/^\*?\s+/, '').trim())
    .filter(Boolean)
    .map((name) => {
      const cleanName = name.replace(/^remotes\/origin\//, '');
      const remote = name.startsWith('remotes/');
      const type: BranchInfo['type'] = cleanName.startsWith('feature/')
        ? 'feature'
        : cleanName.startsWith('fix/')
          ? 'fix'
          : cleanName.startsWith('claude/')
            ? 'claude'
            : 'other';
      return { name: cleanName, remote, type };
    });
}

export function getTags(): string[] {
  const raw = git('tag --sort=-version:refname');
  return raw.split('\n').filter(Boolean);
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export function getLatestCommit(): CommitInfo {
  const format = '%H|%s|%an|%ai';
  const raw = git(`log -1 --format="${format}"`);
  const [hash, message, author, date] = raw.split('|');
  return { hash: hash ?? '', message: message ?? '', author: author ?? '', date: date ?? '' };
}

export function countSignedCommits(limit = 50): number {
  const raw = git(`log -${limit} --format="%GK"`);
  return raw.split('\n').filter((l) => l.trim().length > 0).length;
}
