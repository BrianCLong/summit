import { fetch } from 'undici';

const GITHUB_API_URL = 'https://api.github.com';

interface GitHubClientOptions {
  repo: string;
  auth: string;
}

export class GitHubClient {
  private readonly repo: string;
  private readonly authHeader: string;

  constructor(options: GitHubClientOptions) {
    this.repo = options.repo;
    this.authHeader = `token ${options.auth}`;
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${GITHUB_API_URL}${path}`;
    const headers = {
      ...options.headers,
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // TODO: Implement retry logic with exponential backoff
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  async getIssues(state: 'all' | 'open' | 'closed', since?: string, per_page = 50, page = 1) {
    const params = new URLSearchParams({
        state,
        per_page: String(per_page),
        page: String(page),
        sort: 'created',
        direction: 'asc', // process issues in ascending order
    });
    if (since) {
        params.set('since', since);
    }
    return this.request(`/repos/${this.repo}/issues?${params.toString()}`);
  }

  async searchPRs(issueNumber: number) {
    const query = `repo:${this.repo} is:pr #${issueNumber} in:body,title`;
    const params = new URLSearchParams({ q: query });
    return this.request(`/search/issues?${params.toString()}`);
  }

  async getCommit(sha: string) {
    return this.request(`/repos/${this.repo}/commits/${sha}`);
  }
}

export function getAuthToken(): string {
    if (process.env.GITHUB_TOKEN) {
        return process.env.GITHUB_TOKEN;
    }
    // A bit of a hack, but for now we can assume the user has gh cli installed
    // and is authenticated.
    try {
        const output = require('child_process').execSync('gh auth token', { encoding: 'utf-8' });
        return output.trim();
    } catch (error) {
        console.error("Could not get GitHub token from `gh auth token`.", error);
        throw new Error("GitHub token not found. Please set GITHUB_TOKEN or login with `gh auth login`.");
    }
}