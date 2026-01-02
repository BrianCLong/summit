/**
 * Type definitions for the issue sweeper system
 */

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
  };
}

export interface GitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  html_url: string;
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
  | 'solved_in_this_run'
  | 'not_solved'
  | 'blocked'
  | 'duplicate'
  | 'invalid';

export interface Evidence {
  commits?: string[];
  prs?: string[];
  files?: string[];
  tests?: string[];
  verification_command?: string;
  notes?: string;
}

export interface LedgerEntry {
  issue_number: number;
  title: string;
  state: 'open' | 'closed';
  classification: IssueClassification;
  solved_status: SolvedStatus;
  evidence: Evidence;
  actions_taken: string[];
  verification?: string;
  processed_at: string;
}

export interface State {
  cursor: number;
  last_issue_number: number;
  batch_size: number;
  run_started_at: string | null;
  run_updated_at: string | null;
  open_prs: string[];
  failures: Array<{ issue: number; reason: string }>;
  total_processed: number;
  stats: {
    already_solved: number;
    solved_in_this_run: number;
    not_solved: number;
    blocked: number;
    duplicate: number;
    invalid: number;
  };
}

export interface ProcessingResult {
  issue: GitHubIssue;
  classification: IssueClassification;
  solved_status: SolvedStatus;
  evidence: Evidence;
  actions: string[];
  pr_url?: string;
}
