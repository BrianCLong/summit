/**
 * GitHub API client for fetching issues, PRs, and creating comments
 */

import { GitHubIssue, GitHubPR } from './types.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'BrianCLong';
const REPO_NAME = 'summit';

interface GitHubAPIOptions {
  token?: string;
}

export class GitHubClient {
  private token: string;

  constructor(options: GitHubAPIOptions = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN || '';
    if (!this.token) {
      console.warn('⚠️  No GITHUB_TOKEN found. API rate limits will be very low.');
    }
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${GITHUB_API}${endpoint}`;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      ...(this.token && { Authorization: `token ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${resetDate?.toISOString() || 'unknown'}`
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Fetch issues with pagination
   */
  async fetchIssues(page: number, perPage: number = 50, state: 'all' | 'open' | 'closed' = 'all'): Promise<GitHubIssue[]> {
    const endpoint = `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&page=${page}&per_page=${perPage}&sort=created&direction=asc`;
    const issues = await this.fetch(endpoint);

    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    return issues.filter((issue: any) => !issue.pull_request);
  }

  /**
   * Search for PRs mentioning an issue
   */
  async searchPRsForIssue(issueNumber: number): Promise<GitHubPR[]> {
    const query = `repo:${REPO_OWNER}/${REPO_NAME}+type:pr+${issueNumber}`;
    const endpoint = `/search/issues?q=${encodeURIComponent(query)}&per_page=20`;
    const result = await this.fetch(endpoint);
    return result.items || [];
  }

  /**
   * Search for PRs by keyword
   */
  async searchPRsByKeywords(keywords: string[]): Promise<GitHubPR[]> {
    const query = `repo:${REPO_OWNER}/${REPO_NAME}+type:pr+${keywords.join('+')}`;
    const endpoint = `/search/issues?q=${encodeURIComponent(query)}&per_page=20`;
    const result = await this.fetch(endpoint);
    return result.items || [];
  }

  /**
   * Get a specific issue
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    const endpoint = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
    return this.fetch(endpoint);
  }

  /**
   * Create a comment on an issue
   */
  async createComment(issueNumber: number, body: string): Promise<void> {
    const endpoint = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
    await this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  /**
   * Close an issue
   */
  async closeIssue(issueNumber: number): Promise<void> {
    const endpoint = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
    await this.fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    const endpoint = `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`;
    await this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    });
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<any> {
    return this.fetch('/rate_limit');
  }
}
