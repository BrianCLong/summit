/**
 * Pull Request Validator
 *
 * Validates pull requests against governance policies.
 *
 * @module pve/github/pull-request-validator
 */

import type {
  PRDiffInput,
  PRFile,
  PRMetadata,
  EvaluationContext,
  PolicyResult,
} from '../types/index.js';
import { PolicyEngine, type PolicyEngineConfig } from '../evaluator/PolicyEngine.js';
import { parseDiff, toPRFile, type ParsedDiff } from './diff-parser.js';
import { logger } from '../utils/logger.js';

export interface PRValidatorConfig extends PolicyEngineConfig {
  /** GitHub token for API access */
  githubToken?: string;
  /** Repository owner */
  owner?: string;
  /** Repository name */
  repo?: string;
  /** Skip certain check types */
  skip?: string[];
  /** Additional context to pass to policies */
  context?: Record<string, unknown>;
}

export interface PRValidationResult {
  passed: boolean;
  prNumber?: number;
  sha?: string;
  results: PolicyResult[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
  checkRunOutput?: CheckRunOutput;
}

export interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
  annotations?: CheckAnnotation[];
}

export interface CheckAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  message: string;
  title?: string;
}

/**
 * Pull Request Validator
 */
export class PRValidator {
  private config: PRValidatorConfig;
  private engine: PolicyEngine;

  constructor(config: PRValidatorConfig = {}) {
    this.config = config;
    this.engine = new PolicyEngine(config);
  }

  /**
   * Validate a PR from diff string
   */
  async validateDiff(
    diffString: string,
    metadata?: Partial<PRMetadata>,
    base: string = 'main',
    head: string = 'HEAD',
  ): Promise<PRValidationResult> {
    const parsed = parseDiff(diffString);
    const files = parsed.files.map(toPRFile);

    return this.validate(files, metadata, base, head);
  }

  /**
   * Validate a PR from file list
   */
  async validate(
    files: PRFile[],
    metadata?: Partial<PRMetadata>,
    base: string = 'main',
    head: string = 'HEAD',
  ): Promise<PRValidationResult> {
    const input: PRDiffInput = {
      type: 'pr_diff',
      base,
      head,
      files,
      pr: metadata
        ? {
            title: metadata.title || '',
            body: metadata.body,
            author: metadata.author || 'unknown',
            labels: metadata.labels,
            reviewers: metadata.reviewers,
            isDraft: metadata.isDraft || false,
            createdAt: metadata.createdAt || new Date().toISOString(),
            updatedAt: metadata.updatedAt || new Date().toISOString(),
          }
        : undefined,
    };

    const context: EvaluationContext = {
      type: 'pr_diff',
      input,
      metadata: {
        repo: this.config.owner && this.config.repo
          ? { owner: this.config.owner, name: this.config.repo }
          : undefined,
        timestamp: new Date().toISOString(),
        ...this.config.context,
      },
    };

    const report = await this.engine.evaluate(context);

    const errors = report.results.filter((r) => !r.allowed && r.severity === 'error');
    const warnings = report.results.filter((r) => !r.allowed && r.severity === 'warning');
    const passed = report.results.filter((r) => r.allowed);

    return {
      passed: report.passed,
      results: report.results,
      summary: {
        errors: errors.length,
        warnings: warnings.length,
        passed: passed.length,
      },
      checkRunOutput: this.buildCheckRunOutput(report.results, report.passed),
    };
  }

  /**
   * Validate a PR using GitHub API
   */
  async validateFromGitHub(
    prNumber: number,
    octokit?: any, // Optional Octokit instance
  ): Promise<PRValidationResult> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('Repository owner and name are required for GitHub validation');
    }

    if (!octokit && !this.config.githubToken) {
      throw new Error('GitHub token or Octokit instance required');
    }

    // Use provided octokit or create one
    const client = octokit || await this.createOctokit();

    try {
      // Fetch PR data
      const { data: pr } = await client.rest.pulls.get({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      });

      // Fetch PR files
      const { data: prFiles } = await client.rest.pulls.listFiles({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      });

      const files: PRFile[] = prFiles.map((f: any) => ({
        path: f.filename,
        previousPath: f.previous_filename,
        status: f.status as PRFile['status'],
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      }));

      const metadata: PRMetadata = {
        title: pr.title,
        body: pr.body || undefined,
        author: pr.user?.login || 'unknown',
        labels: pr.labels?.map((l: any) => l.name) || [],
        reviewers: pr.requested_reviewers?.map((r: any) => r.login) || [],
        isDraft: pr.draft || false,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      };

      const result = await this.validate(files, metadata, pr.base.ref, pr.head.sha);
      result.prNumber = prNumber;
      result.sha = pr.head.sha;

      return result;
    } catch (error) {
      logger.error('Failed to validate PR from GitHub', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create GitHub Check Run
   */
  async createCheckRun(
    result: PRValidationResult,
    octokit?: any,
  ): Promise<void> {
    if (!this.config.owner || !this.config.repo || !result.sha) {
      throw new Error('Repository info and SHA required for check run');
    }

    const client = octokit || await this.createOctokit();

    const output = result.checkRunOutput || this.buildCheckRunOutput(result.results, result.passed);

    await client.rest.checks.create({
      owner: this.config.owner,
      repo: this.config.repo,
      name: 'PVE Policy Validation',
      head_sha: result.sha,
      status: 'completed',
      conclusion: result.passed ? 'success' : 'failure',
      output,
    });

    logger.info('Created check run', {
      sha: result.sha,
      passed: result.passed,
    });
  }

  /**
   * Post PR comment with results
   */
  async postComment(
    prNumber: number,
    result: PRValidationResult,
    octokit?: any,
  ): Promise<void> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('Repository info required for PR comment');
    }

    const client = octokit || await this.createOctokit();
    const body = this.buildCommentBody(result);

    await client.rest.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: prNumber,
      body,
    });

    logger.info('Posted PR comment', { prNumber });
  }

  /**
   * Build check run output
   */
  private buildCheckRunOutput(
    results: PolicyResult[],
    passed: boolean,
  ): CheckRunOutput {
    const errors = results.filter((r) => !r.allowed && r.severity === 'error');
    const warnings = results.filter((r) => !r.allowed && r.severity === 'warning');

    const title = passed
      ? 'All policy checks passed'
      : `${errors.length} error(s), ${warnings.length} warning(s)`;

    const summaryLines = [
      passed ? '## ✅ All checks passed' : '## ❌ Policy violations detected',
      '',
      `- **Errors:** ${errors.length}`,
      `- **Warnings:** ${warnings.length}`,
      `- **Passed:** ${results.filter((r) => r.allowed).length}`,
    ];

    const textLines: string[] = [];

    if (errors.length > 0) {
      textLines.push('### Errors');
      for (const e of errors) {
        textLines.push(`- **${e.policy}**: ${e.message}`);
        if (e.fix) {
          textLines.push(`  - Fix: ${e.fix}`);
        }
      }
      textLines.push('');
    }

    if (warnings.length > 0) {
      textLines.push('### Warnings');
      for (const w of warnings) {
        textLines.push(`- **${w.policy}**: ${w.message}`);
        if (w.fix) {
          textLines.push(`  - Fix: ${w.fix}`);
        }
      }
    }

    const annotations: CheckAnnotation[] = results
      .filter((r) => !r.allowed && r.location?.file && r.location?.line)
      .map((r) => ({
        path: r.location!.file!,
        start_line: r.location!.line!,
        end_line: r.location!.line!,
        annotation_level:
          r.severity === 'error'
            ? 'failure'
            : r.severity === 'warning'
              ? 'warning'
              : 'notice',
        message: r.message || r.policy,
        title: r.policy,
      }));

    return {
      title,
      summary: summaryLines.join('\n'),
      text: textLines.length > 0 ? textLines.join('\n') : undefined,
      annotations: annotations.length > 0 ? annotations : undefined,
    };
  }

  /**
   * Build PR comment body
   */
  private buildCommentBody(result: PRValidationResult): string {
    const lines: string[] = [
      result.passed
        ? '## ✅ PVE Policy Validation Passed'
        : '## ❌ PVE Policy Validation Failed',
      '',
    ];

    const errors = result.results.filter((r) => !r.allowed && r.severity === 'error');
    const warnings = result.results.filter((r) => !r.allowed && r.severity === 'warning');

    if (errors.length > 0) {
      lines.push('### Errors');
      lines.push('');
      for (const e of errors) {
        lines.push(`- ❌ **${e.policy}**: ${e.message}`);
        if (e.location?.file) {
          lines.push(`  - File: \`${e.location.file}\`${e.location.line ? `:${e.location.line}` : ''}`);
        }
        if (e.fix) {
          lines.push(`  - 💡 Fix: ${e.fix}`);
        }
      }
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('<details>');
      lines.push(`<summary>⚠️ ${warnings.length} Warning(s)</summary>`);
      lines.push('');
      for (const w of warnings) {
        lines.push(`- **${w.policy}**: ${w.message}`);
      }
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('*Powered by [Summit PVE](https://github.com/BrianCLong/summit)*');

    return lines.join('\n');
  }

  /**
   * Create Octokit instance
   */
  private async createOctokit(): Promise<any> {
    // Dynamic import to avoid requiring @octokit/rest
    try {
      const { Octokit } = await import('@octokit/rest');
      return new Octokit({ auth: this.config.githubToken });
    } catch {
      throw new Error(
        '@octokit/rest is not installed. Install it with: pnpm add @octokit/rest',
      );
    }
  }
}

/**
 * Create a PR validator instance
 */
export function createPRValidator(config?: PRValidatorConfig): PRValidator {
  return new PRValidator(config);
}
