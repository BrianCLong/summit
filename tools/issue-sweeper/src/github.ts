/**
 * GitHub API client with pagination, rate limiting, and retry logic
 */

import { request } from 'undici';
import type { GitHubIssue, GitHubPR, GitHubCommit } from './types.js';

export interface GitHubClientConfig {
  token: string;
  repo: string;
  logger?: any;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  rateLimit: RateLimit | null;
}

export class GitHubClient {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl = 'https://api.github.com';
  private logger: any;

  constructor(config: GitHubClientConfig) {
    this.token = config.token;
    const [owner, repo] = config.repo.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repo format: ${config.repo}. Expected: owner/repo`);
    }
    this.owner = owner;
    this.repo = repo;
    this.logger = config.logger || console;
  }

  /**
   * Fetch issues with pagination support
   */
  async fetchIssues(options: {
    state?: 'all' | 'open' | 'closed';
    since?: string;
    perPage?: number;
    page?: number;
  }): Promise<PaginatedResponse<GitHubIssue>> {
    const { state = 'all', since, perPage = 50, page = 1 } = options;

    const params = new URLSearchParams({
      state,
      per_page: perPage.toString(),
      page: page.toString(),
      sort: 'updated',
      direction: 'desc',
    });

    if (since) {
      params.set('since', since);
    }

    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues?${params}`;

    const result = await this.makeRequest<GitHubIssue[]>(url);

    // Filter out pull requests (issues API includes them)
    const issues = result.data.filter((issue: any) => !issue.pull_request);

    // Parse Link header for pagination
    const nextCursor = this.parseLinkHeader(result.headers);

    return {
      data: issues,
      nextCursor: nextCursor ? (page + 1).toString() : null,
      rateLimit: result.rateLimit,
    };
  }

  /**
   * Search for PRs referencing an issue number
   */
  async searchPRsForIssue(issueNumber: number): Promise<GitHubPR[]> {
    // Search in both title and body for the issue reference
    const query = `repo:${this.owner}/${this.repo} type:pr #${issueNumber}`;
    const params = new URLSearchParams({
      q: query,
      per_page: '100',
    });

    const url = `${this.baseUrl}/search/issues?${params}`;

    try {
      const result = await this.makeRequest<{ items: GitHubPR[] }>(url);
      return result.data.items;
    } catch (error: any) {
      // Search API has strict rate limits, log but don't fail
      this.logger.warn(`Failed to search PRs for issue #${issueNumber}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a specific PR by number
   */
  async getPR(prNumber: number): Promise<GitHubPR | null> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}`;

    try {
      const result = await this.makeRequest<GitHubPR>(url);
      return result.data;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search commits for issue references (best effort)
   */
  async searchCommitsForIssue(issueNumber: number): Promise<GitHubCommit[]> {
    // Use search API to find commits mentioning the issue
    const query = `repo:${this.owner}/${this.repo} #${issueNumber}`;
    const params = new URLSearchParams({
      q: query,
      per_page: '20',
    });

    const url = `${this.baseUrl}/search/commits?${params}`;

    try {
      const result = await this.makeRequest<{ items: GitHubCommit[] }>(url, {
        accept: 'application/vnd.github.cloak-preview+json',
      });
      return result.data.items;
    } catch (error: any) {
      this.logger.warn(`Failed to search commits for issue #${issueNumber}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<RateLimit> {
    const url = `${this.baseUrl}/rate_limit`;
    const result = await this.makeRequest<{ resources: { core: RateLimit } }>(url);
    return result.data.resources.core;
  }

  /**
   * Make an authenticated request with retry and rate limit handling
   */
  private async makeRequest<T>(
    url: string,
    options: { accept?: string } = {},
    retryCount = 0
  ): Promise<{ data: T; headers: Record<string, string>; rateLimit: RateLimit | null }> {
    const maxRetries = 4;
    const baseDelay = 2000; // 2 seconds

    try {
      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: options.accept || 'application/vnd.github+json',
          'User-Agent': 'issue-sweeper/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      const body = await response.body.text();
      const headers: Record<string, string> = {};

      // Convert headers to plain object
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        }
      }

      // Parse rate limit from headers
      const rateLimit = this.parseRateLimit(headers);

      // Check rate limit and warn if low
      if (rateLimit && rateLimit.remaining < 100) {
        const resetDate = new Date(rateLimit.reset * 1000);
        this.logger.warn(`Rate limit low: ${rateLimit.remaining} remaining. Resets at ${resetDate.toISOString()}`);
      }

      // Handle rate limiting
      if (response.statusCode === 403 || response.statusCode === 429) {
        if (retryCount < maxRetries) {
          const retryAfter = headers['retry-after']
            ? parseInt(headers['retry-after']) * 1000
            : baseDelay * Math.pow(2, retryCount);

          this.logger.warn(
            `Rate limited (${response.statusCode}). Retrying after ${retryAfter}ms (attempt ${retryCount + 1}/${maxRetries})`
          );

          await this.sleep(retryAfter);
          return this.makeRequest<T>(url, options, retryCount + 1);
        }
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }

      // Handle other errors
      if (response.statusCode >= 400) {
        const error: any = new Error(`GitHub API error: ${response.statusCode} ${body}`);
        error.statusCode = response.statusCode;
        throw error;
      }

      const data = body ? JSON.parse(body) : null;

      return { data, headers, rateLimit };
    } catch (error: any) {
      // Retry on network errors
      if (retryCount < maxRetries && this.isNetworkError(error)) {
        const delay = baseDelay * Math.pow(2, retryCount);
        this.logger.warn(`Network error. Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await this.sleep(delay);
        return this.makeRequest<T>(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Parse rate limit from response headers
   */
  private parseRateLimit(headers: Record<string, string>): RateLimit | null {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    const used = headers['x-ratelimit-used'];

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        used: used ? parseInt(used) : 0,
      };
    }

    return null;
  }

  /**
   * Parse Link header for pagination
   */
  private parseLinkHeader(headers: Record<string, string>): string | null {
    const link = headers['link'];
    if (!link) return null;

    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    return nextMatch ? nextMatch[1] : null;
  }

  /**
   * Check if error is a network error (vs application error)
   */
  private isNetworkError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('socket hang up')
    );
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
