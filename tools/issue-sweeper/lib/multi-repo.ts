/**
 * Multi-Repository Support
 *
 * Process issues across multiple repositories simultaneously
 */

import { GitHubClient } from './github.js';
import { processIssue, ProcessingOptions } from './processor.js';
import { State } from './types.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface RepoConfig {
  owner: string;
  name: string;
  enabled: boolean;
  batchSize?: number;
  options?: ProcessingOptions;
  priority?: number; // Higher priority processed first
}

export interface MultiRepoState {
  repos: Record<string, RepoState>;
  global: {
    totalProcessed: number;
    totalFixed: number;
    totalPRs: number;
    startedAt: string | null;
    lastUpdated: string | null;
  };
}

export interface RepoState {
  owner: string;
  name: string;
  cursor: number;
  totalProcessed: number;
  lastIssueNumber: number;
  stats: State['stats'];
  completedAt: string | null;
}

const MULTI_REPO_STATE_FILE = join(process.cwd(), 'tools/issue-sweeper/MULTI_REPO_STATE.json');

export class MultiRepoManager {
  private repos: Map<string, RepoConfig> = new Map();
  private state: MultiRepoState;
  private githubClient: GitHubClient;

  constructor() {
    this.githubClient = new GitHubClient();
    this.state = this.loadState();
  }

  /**
   * Add repository to process
   */
  addRepo(config: RepoConfig): void {
    const key = `${config.owner}/${config.name}`;
    this.repos.set(key, config);

    // Initialize state if not exists
    if (!this.state.repos[key]) {
      this.state.repos[key] = {
        owner: config.owner,
        name: config.name,
        cursor: 1,
        totalProcessed: 0,
        lastIssueNumber: 0,
        stats: {
          already_solved: 0,
          solved_in_this_run: 0,
          not_solved: 0,
          blocked: 0,
          duplicate: 0,
          invalid: 0,
        },
        completedAt: null,
      };
    }
  }

  /**
   * Load repos from config file
   */
  loadReposFromConfig(configPath: string): void {
    if (!existsSync(configPath)) {
      console.error(`❌ Config file not found: ${configPath}`);
      return;
    }

    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      if (config.repositories && Array.isArray(config.repositories)) {
        for (const repo of config.repositories) {
          this.addRepo(repo);
        }

        console.log(`✅ Loaded ${config.repositories.length} repositories from config`);
      }
    } catch (error) {
      console.error('❌ Failed to load config:', error);
    }
  }

  /**
   * Process all repositories
   */
  async processAll(maxBatchesPerRepo: number = 0): Promise<void> {
    console.log(`\n🚀 Processing ${this.repos.size} repositories...\n`);

    if (!this.state.global.startedAt) {
      this.state.global.startedAt = new Date().toISOString();
    }

    // Sort repos by priority
    const sortedRepos = Array.from(this.repos.entries()).sort(
      (a, b) => (b[1].priority || 0) - (a[1].priority || 0)
    );

    for (const [key, config] of sortedRepos) {
      if (!config.enabled) {
        console.log(`⏭️  Skipping disabled repo: ${key}`);
        continue;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📦 Processing: ${key}`);
      console.log(`${'='.repeat(80)}\n`);

      try {
        await this.processRepo(key, config, maxBatchesPerRepo);
      } catch (error) {
        console.error(`❌ Error processing ${key}:`, error);
      }

      // Save state after each repo
      this.saveState();
    }

    this.state.global.lastUpdated = new Date().toISOString();
    this.saveState();

    this.printSummary();
  }

  /**
   * Process single repository
   */
  private async processRepo(
    key: string,
    config: RepoConfig,
    maxBatches: number
  ): Promise<void> {
    const repoState = this.state.repos[key];
    const batchSize = config.batchSize || 50;
    let batchCount = 0;

    while (true) {
      console.log(`\n📦 Batch ${batchCount + 1} for ${key} (page ${repoState.cursor})`);

      try {
        // Fetch issues for this repo
        const issues = await this.githubClient.fetchIssues(repoState.cursor, batchSize, 'all');

        if (issues.length === 0) {
          console.log(`✅ Completed ${key} - no more issues`);
          repoState.completedAt = new Date().toISOString();
          break;
        }

        console.log(`   Found ${issues.length} issues`);

        // Process each issue
        for (const issue of issues) {
          try {
            const result = await processIssue(this.githubClient, issue, config.options || {});

            // Update repo state
            repoState.totalProcessed++;
            repoState.lastIssueNumber = issue.number;
            repoState.stats[result.solved_status]++;

            // Update global state
            this.state.global.totalProcessed++;
            if (result.solved_status === 'solved_in_this_run') {
              this.state.global.totalFixed++;
            }
            if (result.pr_url) {
              this.state.global.totalPRs++;
            }

            // Small delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`   ❌ Error processing issue #${issue.number}:`, error);
          }
        }

        // Update cursor
        repoState.cursor++;
        batchCount++;

        // Save state
        this.saveState();

        // Check max batches
        if (maxBatches > 0 && batchCount >= maxBatches) {
          console.log(`⏸️  Reached max batches for ${key}`);
          break;
        }

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error in batch for ${key}:`, error);
        break;
      }
    }
  }

  /**
   * Print summary across all repos
   */
  private printSummary(): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 MULTI-REPO SUMMARY`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Global Statistics:`);
    console.log(`  - Total Processed: ${this.state.global.totalProcessed}`);
    console.log(`  - Total Fixed: ${this.state.global.totalFixed}`);
    console.log(`  - Total PRs: ${this.state.global.totalPRs}`);
    console.log(`\nPer-Repository Breakdown:\n`);

    for (const [key, repoState] of Object.entries(this.state.repos)) {
      const completionStatus = repoState.completedAt ? '✅ Complete' : '⏳ In Progress';

      console.log(`${key}: ${completionStatus}`);
      console.log(`  - Processed: ${repoState.totalProcessed}`);
      console.log(`  - Already Solved: ${repoState.stats.already_solved}`);
      console.log(`  - Solved in Run: ${repoState.stats.solved_in_this_run}`);
      console.log(`  - Not Solved: ${repoState.stats.not_solved}`);
      console.log(`  - Blocked: ${repoState.stats.blocked}`);
      console.log(``);
    }
  }

  /**
   * Load state from file
   */
  private loadState(): MultiRepoState {
    if (!existsSync(MULTI_REPO_STATE_FILE)) {
      return {
        repos: {},
        global: {
          totalProcessed: 0,
          totalFixed: 0,
          totalPRs: 0,
          startedAt: null,
          lastUpdated: null,
        },
      };
    }

    try {
      return JSON.parse(readFileSync(MULTI_REPO_STATE_FILE, 'utf-8'));
    } catch (error) {
      console.error('❌ Failed to load multi-repo state:', error);
      return {
        repos: {},
        global: {
          totalProcessed: 0,
          totalFixed: 0,
          totalPRs: 0,
          startedAt: null,
          lastUpdated: null,
        },
      };
    }
  }

  /**
   * Save state to file
   */
  private saveState(): void {
    try {
      writeFileSync(MULTI_REPO_STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Failed to save multi-repo state:', error);
    }
  }

  /**
   * Get state for reporting
   */
  getState(): MultiRepoState {
    return this.state;
  }

  /**
   * Reset state for a specific repo
   */
  resetRepo(key: string): void {
    if (this.state.repos[key]) {
      this.state.repos[key] = {
        owner: this.state.repos[key].owner,
        name: this.state.repos[key].name,
        cursor: 1,
        totalProcessed: 0,
        lastIssueNumber: 0,
        stats: {
          already_solved: 0,
          solved_in_this_run: 0,
          not_solved: 0,
          blocked: 0,
          duplicate: 0,
          invalid: 0,
        },
        completedAt: null,
      };

      this.saveState();
    }
  }

  /**
   * Reset all state
   */
  resetAll(): void {
    this.state = {
      repos: {},
      global: {
        totalProcessed: 0,
        totalFixed: 0,
        totalPRs: 0,
        startedAt: null,
        lastUpdated: null,
      },
    };

    for (const [key, config] of this.repos) {
      this.addRepo(config);
    }

    this.saveState();
  }
}

/**
 * Example multi-repo config
 */
export function generateExampleConfig(): string {
  const config = {
    repositories: [
      {
        owner: 'BrianCLong',
        name: 'summit',
        enabled: true,
        batchSize: 50,
        priority: 1,
        options: {
          autoFix: true,
          autoPR: true,
          skipVerification: false,
        },
      },
      {
        owner: 'BrianCLong',
        name: 'another-repo',
        enabled: false,
        batchSize: 25,
        priority: 0,
        options: {
          autoFix: false,
          autoPR: false,
          skipVerification: false,
        },
      },
    ],
  };

  return JSON.stringify(config, null, 2);
}
