/**
 * GitHub API integration for fetching issues and PRs
 */
import { TriageItem } from '../types.js';
export interface GitHubFetchOptions {
    owner: string;
    repo: string;
    token?: string;
    includeIssues?: boolean;
    includePRs?: boolean;
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    maxResults?: number;
}
export declare function fetchGitHubIssues(options: GitHubFetchOptions): Promise<TriageItem[]>;
/**
 * CLI-friendly wrapper that uses environment variables
 */
export declare function fetchGitHubIssuesFromEnv(): Promise<TriageItem[]>;
//# sourceMappingURL=github-fetcher.d.ts.map