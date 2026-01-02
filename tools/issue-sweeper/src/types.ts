/**
 * Core types for the Issue Sweeper automation system
 */

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  body?: string | null;
  user: {
    login: string;
  };
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  created_at: string;
  body?: string | null;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
  };
}

export type IssueClassification =
  | 'bug'
  | 'feature'
  | 'docs'
  | 'question'
  | 'security'
  | 'ci'
  | 'perf'
  | 'refactor'
  | 'unknown';

export type SolvedStatus =
  | 'already_solved'
  | 'not_solved'
  | 'blocked'
  | 'duplicate'
  | 'invalid'
  | 'solved_in_this_run';

export interface Evidence {
  prs: Array<{
    number: number;
    url: string;
    mergedAt: string | null;
    title: string;
  }>;
  commits: Array<{
    sha: string;
    url: string;
    message: string;
  }>;
  paths: Array<{
    path: string;
    reason: string;
  }>;
  tests: Array<{
    name: string;
    command: string;
  }>;
}

export interface LedgerEntry {
  issue_number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  labels: string[];
  updatedAt: string;
  createdAt: string;
  classification: IssueClassification;
  solved_status: SolvedStatus;
  evidence: Evidence;
  actions_taken: string[];
  verification: string[];
  notes: string;
  run_id: string;
  processed_at: string;
}

export interface FailureRecord {
  issue_number: number;
  step: string;
  error: string;
  timestamp: string;
}

export interface RunState {
  repo: string;
  state_filter: 'all' | 'open' | 'closed';
  batch_size: number;
  cursor: string | null;
  last_processed_issue_number: number | null;
  run_started_at: string;
  run_updated_at: string;
  run_id: string;
  processed_count: number;
  error_count: number;
  failures: FailureRecord[];
  open_prs: Array<{
    issue_number: number;
    pr_number: number;
    pr_url: string;
    branch: string;
  }>;
}

export interface CLIConfig {
  repo: string;
  batchSize: number;
  state: 'all' | 'open' | 'closed';
  since?: string;
  maxIssues?: number;
  dryRun: boolean;
  writeComments: boolean;
  openPrs: boolean;
  resume: boolean;
  reset: boolean;
  resetLedger: boolean;
  iUnderstand: boolean;
}

export interface BatchResult {
  issuesProcessed: number;
  alreadySolved: number;
  notSolved: number;
  blocked: number;
  duplicate: number;
  invalid: number;
  errors: number;
}
