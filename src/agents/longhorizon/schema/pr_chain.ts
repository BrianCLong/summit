// src/agents/longhorizon/schema/pr_chain.ts
import * as crypto from 'crypto';

export type EvidenceId = `LH-${string}`;

export interface PRCommit {
  sha: string;
  message: string;
  files_changed: Array<{ path: string; additions: number; deletions: number }>;
}

export interface PRChainRecord {
  evidence_id?: EvidenceId;           // deterministic: derived from content hash
  repo: { name: string; url?: string };
  objective: string;                // unified functional objective (paper concept)
  prs: Array<{
    pr_number?: number;
    title: string;
    body?: string;
    commits: PRCommit[];
    bugfix?: boolean;               // refinement signal (paper concept)
  }>;
  metadata?: Record<string, any>;
}

export function stableStringify(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Normalizes a PRChainRecord for stable hashing.
 */
export function normalizePRChain(record: PRChainRecord): PRChainRecord {
  return {
    repo: {
      name: record.repo.name,
      url: record.repo.url,
    },
    objective: record.objective.trim(),
    prs: record.prs.map(pr => ({
      pr_number: pr.pr_number,
      title: pr.title.trim(),
      body: pr.body?.trim(),
      bugfix: !!pr.bugfix,
      commits: pr.commits.map(commit => ({
        sha: commit.sha,
        message: commit.message.trim(),
        files_changed: [...commit.files_changed].sort((a, b) => a.path.localeCompare(b.path)),
      })),
    })),
    metadata: record.metadata,
  };
}

export function computeEvidenceId(record: PRChainRecord): EvidenceId {
  const normalized = normalizePRChain(record);
  const hash = crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex').substring(0, 12);
  return `LH-${hash}`;
}
