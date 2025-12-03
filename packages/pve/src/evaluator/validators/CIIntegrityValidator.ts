/**
 * CI Integrity Validator
 *
 * Validates CI/CD pipeline configurations for security and correctness.
 *
 * @module pve/evaluator/validators/CIIntegrityValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  CIIntegrityInput,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface CIIntegrityValidatorConfig {
  /** Required jobs in the pipeline */
  requiredJobs?: string[];
  /** Required steps in any job */
  requiredSteps?: string[];
  /** Forbidden commands */
  forbiddenCommands?: string[];
  /** Require approval for production deployments */
  requireProductionApproval?: boolean;
  /** Minimum timeout for jobs */
  minJobTimeout?: number;
  /** Maximum timeout for jobs */
  maxJobTimeout?: number;
  /** Required environment protections */
  requiredEnvironments?: string[];
}

const DEFAULT_CONFIG: CIIntegrityValidatorConfig = {
  requiredJobs: ['lint', 'test', 'build'],
  requiredSteps: [],
  forbiddenCommands: [
    'curl.*\\|.*sh',
    'wget.*\\|.*sh',
    'eval\\s+\\$',
    'npm\\s+publish.*--force',
    'git\\s+push.*--force',
  ],
  requireProductionApproval: true,
  maxJobTimeout: 60, // 60 minutes
};

export class CIIntegrityValidator {
  private config: CIIntegrityValidatorConfig;

  constructor(config: CIIntegrityValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'ci_integrity') {
      return [];
    }

    const input = context.input as CIIntegrityInput;
    const results: PolicyResult[] = [];

    switch (input.platform) {
      case 'github_actions':
        results.push(...this.validateGitHubActions(input));
        break;
      case 'gitlab_ci':
        results.push(...this.validateGitLabCI(input));
        break;
      case 'jenkins':
        results.push(...this.validateJenkins(input));
        break;
      case 'circleci':
        results.push(...this.validateCircleCI(input));
        break;
      default:
        results.push(...this.validateGeneric(input));
    }

    return results;
  }

  private validateGitHubActions(input: CIIntegrityInput): PolicyResult[] {
    const results: PolicyResult[] = [];
    const config = input.config as GitHubActionsConfig;

    if (!config || typeof config !== 'object') {
      results.push(
        fail('pve.ci.invalid_config', 'Invalid GitHub Actions configuration', {
          severity: 'error',
          location: { file: input.filePath },
        }),
      );
      return results;
    }

    // Check required jobs
    const jobs = Object.keys(config.jobs || {});
    for (const required of this.config.requiredJobs || []) {
      const hasJob = jobs.some(
        (j) => j.toLowerCase().includes(required.toLowerCase()),
      );
      if (!hasJob) {
        results.push(
          warn('pve.ci.missing_job', `Missing required job type: ${required}`, {
            location: { file: input.filePath },
            fix: `Add a job that includes "${required}" in its name or purpose`,
          }),
        );
      }
    }

    if ((this.config.requiredJobs || []).every((r) =>
      jobs.some((j) => j.toLowerCase().includes(r.toLowerCase())),
    )) {
      results.push(pass('pve.ci.required_jobs'));
    }

    // Check for forbidden commands
    const allSteps = this.extractGitHubActionsSteps(config);
    results.push(...this.checkForbiddenCommands(allSteps, input.filePath));

    // Check permissions
    results.push(...this.checkGitHubActionsPermissions(config, input.filePath));

    // Check for pinned action versions
    results.push(...this.checkPinnedActions(config, input.filePath));

    // Check timeouts
    for (const [jobName, job] of Object.entries(config.jobs || {})) {
      if (job && typeof job === 'object') {
        const jobConfig = job as { 'timeout-minutes'?: number };
        if (this.config.maxJobTimeout && jobConfig['timeout-minutes']) {
          if (jobConfig['timeout-minutes'] > this.config.maxJobTimeout) {
            results.push(
              warn('pve.ci.job_timeout', `Job "${jobName}" timeout exceeds maximum of ${this.config.maxJobTimeout} minutes`, {
                location: { file: input.filePath, field: `jobs.${jobName}.timeout-minutes` },
              }),
            );
          }
        }
      }
    }

    // Check for environment protections
    if (this.config.requireProductionApproval) {
      results.push(...this.checkProductionProtection(config, input.filePath));
    }

    return results;
  }

  private extractGitHubActionsSteps(config: GitHubActionsConfig): string[] {
    const steps: string[] = [];

    for (const job of Object.values(config.jobs || {})) {
      if (job && typeof job === 'object') {
        const jobConfig = job as { steps?: Array<{ run?: string; uses?: string }> };
        for (const step of jobConfig.steps || []) {
          if (step.run) {
            steps.push(step.run);
          }
          if (step.uses) {
            steps.push(step.uses);
          }
        }
      }
    }

    return steps;
  }

  private checkGitHubActionsPermissions(
    config: GitHubActionsConfig,
    filePath: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    // Check for overly permissive permissions
    if (config.permissions === 'write-all') {
      results.push(
        fail('pve.ci.permissions', 'Workflow has write-all permissions which is overly permissive', {
          severity: 'error',
          location: { file: filePath, field: 'permissions' },
          fix: 'Use least-privilege permissions for each job',
        }),
      );
    } else if (!config.permissions) {
      results.push(
        warn('pve.ci.permissions', 'Workflow does not explicitly set permissions', {
          location: { file: filePath },
          fix: 'Add explicit permissions block with least-privilege access',
        }),
      );
    } else {
      results.push(pass('pve.ci.permissions'));
    }

    return results;
  }

  private checkPinnedActions(
    config: GitHubActionsConfig,
    filePath: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    const unpinnedActions: string[] = [];

    for (const [jobName, job] of Object.entries(config.jobs || {})) {
      if (job && typeof job === 'object') {
        const jobConfig = job as { steps?: Array<{ uses?: string }> };
        for (const step of jobConfig.steps || []) {
          if (step.uses && !this.isActionPinned(step.uses)) {
            unpinnedActions.push(`${jobName}: ${step.uses}`);
          }
        }
      }
    }

    if (unpinnedActions.length > 0) {
      results.push(
        warn('pve.ci.unpinned_actions', `${unpinnedActions.length} action(s) are not pinned to a SHA`, {
          location: { file: filePath },
          fix: 'Pin actions to a full commit SHA for security',
          details: { unpinnedActions: unpinnedActions.slice(0, 5) },
        }),
      );
    } else {
      results.push(pass('pve.ci.pinned_actions'));
    }

    return results;
  }

  private isActionPinned(uses: string): boolean {
    // Check if action is pinned to a SHA (40 hex characters)
    const sha = uses.split('@')[1];
    return sha ? /^[a-f0-9]{40}$/i.test(sha) : false;
  }

  private checkProductionProtection(
    config: GitHubActionsConfig,
    filePath: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    let hasProductionProtection = false;

    for (const [jobName, job] of Object.entries(config.jobs || {})) {
      if (job && typeof job === 'object') {
        const jobConfig = job as { environment?: string | { name: string } };
        const envName =
          typeof jobConfig.environment === 'string'
            ? jobConfig.environment
            : jobConfig.environment?.name;

        if (
          envName &&
          (envName.toLowerCase().includes('prod') ||
            envName.toLowerCase().includes('production'))
        ) {
          hasProductionProtection = true;
        }

        // Check for deployment jobs without environment protection
        if (
          (jobName.toLowerCase().includes('deploy') ||
            jobName.toLowerCase().includes('release')) &&
          !envName
        ) {
          results.push(
            warn('pve.ci.unprotected_deployment', `Deployment job "${jobName}" has no environment protection`, {
              location: { file: filePath, field: `jobs.${jobName}` },
              fix: 'Add environment protection with required reviewers',
            }),
          );
        }
      }
    }

    if (!hasProductionProtection) {
      results.push(
        warn('pve.ci.no_production_environment', 'No production environment protection detected', {
          location: { file: filePath },
          fix: 'Add a protected environment for production deployments',
        }),
      );
    } else {
      results.push(pass('pve.ci.production_protection'));
    }

    return results;
  }

  private checkForbiddenCommands(
    commands: string[],
    filePath: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    const combined = commands.join('\n');

    for (const forbidden of this.config.forbiddenCommands || []) {
      const regex = new RegExp(forbidden, 'i');
      if (regex.test(combined)) {
        results.push(
          fail('pve.ci.forbidden_command', `Forbidden command pattern detected: ${forbidden}`, {
            severity: 'error',
            location: { file: filePath },
            fix: 'Remove or replace the dangerous command pattern',
          }),
        );
      }
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.ci.forbidden_commands'));
    }

    return results;
  }

  private validateGitLabCI(input: CIIntegrityInput): PolicyResult[] {
    // Placeholder for GitLab CI validation
    return [pass('pve.ci.gitlab', 'GitLab CI validation placeholder')];
  }

  private validateJenkins(input: CIIntegrityInput): PolicyResult[] {
    // Placeholder for Jenkins validation
    return [pass('pve.ci.jenkins', 'Jenkins validation placeholder')];
  }

  private validateCircleCI(input: CIIntegrityInput): PolicyResult[] {
    // Placeholder for CircleCI validation
    return [pass('pve.ci.circleci', 'CircleCI validation placeholder')];
  }

  private validateGeneric(input: CIIntegrityInput): PolicyResult[] {
    return [warn('pve.ci.unknown_platform', `Unknown CI platform: ${input.platform}`, {
      location: { file: input.filePath },
    })];
  }
}

// Type definitions for GitHub Actions
interface GitHubActionsConfig {
  name?: string;
  on?: unknown;
  permissions?: string | Record<string, string>;
  env?: Record<string, string>;
  jobs?: Record<string, unknown>;
}
