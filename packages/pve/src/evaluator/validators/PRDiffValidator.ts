/**
 * PR Diff Validator
 *
 * Validates pull request diffs against governance policies.
 *
 * @module pve/evaluator/validators/PRDiffValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  PRDiffInput,
  PRFile,
} from '../../types/index.js';
import { pass, fail, warn, PolicyResultBuilder } from '../PolicyResult.js';

export interface PRDiffValidatorConfig {
  /** Maximum number of files in a single PR */
  maxFiles?: number;
  /** Maximum lines changed in a single PR */
  maxLinesChanged?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Forbidden file patterns */
  forbiddenPatterns?: string[];
  /** Required files for certain changes */
  requiredFileChanges?: RequiredFileChange[];
  /** Protected branches */
  protectedBranches?: string[];
  /** Required reviewers for certain paths */
  requiredReviewers?: PathReviewerRule[];
  /** Commit message patterns */
  commitMessagePattern?: string;
}

export interface RequiredFileChange {
  /** If files matching this pattern are changed */
  trigger: string;
  /** These files must also be changed */
  required: string[];
  /** Severity if not met */
  severity?: 'error' | 'warning';
}

export interface PathReviewerRule {
  /** Path pattern */
  pattern: string;
  /** Required reviewers (usernames or teams) */
  reviewers: string[];
}

const DEFAULT_CONFIG: PRDiffValidatorConfig = {
  maxFiles: 50,
  maxLinesChanged: 2000,
  maxFileSize: 500000, // 500KB
  forbiddenPatterns: [
    '\\.env$',
    '\\.env\\.local$',
    'credentials\\.json$',
    'secrets\\.yaml$',
    '\\.pem$',
    '\\.key$',
    'id_rsa',
    '\\.p12$',
  ],
  protectedBranches: ['main', 'master', 'production'],
};

export class PRDiffValidator {
  private config: PRDiffValidatorConfig;

  constructor(config: PRDiffValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'pr_diff') {
      return [];
    }

    const input = context.input as PRDiffInput;
    const results: PolicyResult[] = [];

    // Check file count
    if (this.config.maxFiles && input.files.length > this.config.maxFiles) {
      results.push(
        fail(
          'pve.pr.max_files',
          `PR contains ${input.files.length} files, exceeding the maximum of ${this.config.maxFiles}`,
          {
            severity: 'warning',
            fix: 'Consider splitting this PR into smaller, focused changes',
            details: {
              actual: input.files.length,
              expected: `<= ${this.config.maxFiles}`,
            },
          },
        ),
      );
    } else {
      results.push(pass('pve.pr.max_files'));
    }

    // Check total lines changed
    const totalLines = input.files.reduce(
      (sum, f) => sum + f.additions + f.deletions,
      0,
    );
    if (this.config.maxLinesChanged && totalLines > this.config.maxLinesChanged) {
      results.push(
        fail(
          'pve.pr.max_lines',
          `PR changes ${totalLines} lines, exceeding the maximum of ${this.config.maxLinesChanged}`,
          {
            severity: 'warning',
            fix: 'Consider splitting this PR into smaller, focused changes',
            details: {
              actual: totalLines,
              expected: `<= ${this.config.maxLinesChanged}`,
            },
          },
        ),
      );
    } else {
      results.push(pass('pve.pr.max_lines'));
    }

    // Check forbidden patterns
    const forbiddenResults = this.checkForbiddenPatterns(input.files);
    results.push(...forbiddenResults);

    // Check required file changes
    if (this.config.requiredFileChanges) {
      const requiredResults = this.checkRequiredFileChanges(input.files);
      results.push(...requiredResults);
    }

    // Check protected branch rules
    if (this.config.protectedBranches?.includes(input.base)) {
      results.push(
        PolicyResultBuilder.for('pve.pr.protected_branch')
          .deny()
          .asWarning()
          .message(`PR targets protected branch: ${input.base}`)
          .context({ branch: input.base })
          .build(),
      );
    } else {
      results.push(pass('pve.pr.protected_branch'));
    }

    // Check for sensitive content in patches
    const sensitiveResults = this.checkSensitiveContent(input.files);
    results.push(...sensitiveResults);

    // Validate PR metadata
    if (input.pr) {
      const metadataResults = this.validatePRMetadata(input.pr);
      results.push(...metadataResults);
    }

    return results;
  }

  private checkForbiddenPatterns(files: PRFile[]): PolicyResult[] {
    const results: PolicyResult[] = [];
    const forbiddenFiles: string[] = [];

    for (const file of files) {
      for (const pattern of this.config.forbiddenPatterns || []) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(file.path)) {
          forbiddenFiles.push(file.path);
          results.push(
            fail(
              'pve.pr.forbidden_file',
              `File "${file.path}" matches forbidden pattern "${pattern}"`,
              {
                severity: 'error',
                location: { file: file.path },
                fix: 'Remove this file from the PR or add it to .gitignore',
              },
            ),
          );
        }
      }
    }

    if (forbiddenFiles.length === 0) {
      results.push(pass('pve.pr.forbidden_file'));
    }

    return results;
  }

  private checkRequiredFileChanges(files: PRFile[]): PolicyResult[] {
    const results: PolicyResult[] = [];
    const changedPaths = new Set(files.map((f) => f.path));

    for (const rule of this.config.requiredFileChanges || []) {
      const triggerRegex = new RegExp(rule.trigger);
      const triggered = files.some((f) => triggerRegex.test(f.path));

      if (triggered) {
        const missingRequired = rule.required.filter(
          (r) => !changedPaths.has(r),
        );

        if (missingRequired.length > 0) {
          results.push(
            fail(
              'pve.pr.required_files',
              `Changes matching "${rule.trigger}" require updates to: ${missingRequired.join(', ')}`,
              {
                severity: rule.severity || 'warning',
                fix: `Update the following files: ${missingRequired.join(', ')}`,
                details: {
                  trigger: rule.trigger,
                  missingFiles: missingRequired,
                },
              },
            ),
          );
        } else {
          results.push(pass('pve.pr.required_files'));
        }
      }
    }

    return results;
  }

  private checkSensitiveContent(files: PRFile[]): PolicyResult[] {
    const results: PolicyResult[] = [];
    const sensitivePatterns = [
      { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/ },
      { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
      { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/ },
      { name: 'Generic Secret', pattern: /(?:password|secret|api_key|apikey|token)\s*[=:]\s*["'][^"']{8,}["']/i },
      { name: 'JWT', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/ },
      { name: 'Slack Token', pattern: /xox[baprs]-[0-9a-zA-Z-]+/ },
      { name: 'Azure Key', pattern: /(?:AccountKey|SharedAccessKey)=[a-zA-Z0-9+/=]{44,}/ },
    ];

    let foundSensitive = false;

    for (const file of files) {
      if (!file.patch) continue;

      for (const { name, pattern } of sensitivePatterns) {
        if (pattern.test(file.patch)) {
          foundSensitive = true;
          results.push(
            fail(
              'pve.pr.sensitive_content',
              `Potential ${name} detected in ${file.path}`,
              {
                severity: 'error',
                location: { file: file.path },
                fix: `Remove the ${name.toLowerCase()} and use environment variables or a secrets manager instead`,
              },
            ),
          );
        }
      }
    }

    if (!foundSensitive) {
      results.push(pass('pve.pr.sensitive_content'));
    }

    return results;
  }

  private validatePRMetadata(
    pr: NonNullable<PRDiffInput['pr']>,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    // Check title length
    if (pr.title.length < 10) {
      results.push(
        warn('pve.pr.title_length', 'PR title is too short (minimum 10 characters)', {
          fix: 'Provide a more descriptive title',
          details: { actual: pr.title.length, expected: '>= 10' },
        }),
      );
    } else if (pr.title.length > 100) {
      results.push(
        warn('pve.pr.title_length', 'PR title is too long (maximum 100 characters)', {
          fix: 'Shorten the title and add details to the description',
          details: { actual: pr.title.length, expected: '<= 100' },
        }),
      );
    } else {
      results.push(pass('pve.pr.title_length'));
    }

    // Check for description
    if (!pr.body || pr.body.trim().length < 20) {
      results.push(
        warn('pve.pr.description', 'PR description is missing or too short', {
          fix: 'Add a description explaining what this PR does and why',
        }),
      );
    } else {
      results.push(pass('pve.pr.description'));
    }

    // Check draft status for large changes
    if (!pr.isDraft && pr.labels?.includes('work-in-progress')) {
      results.push(
        warn('pve.pr.draft_status', 'PR is marked as work-in-progress but not a draft', {
          fix: 'Convert to draft PR or remove the work-in-progress label',
        }),
      );
    } else {
      results.push(pass('pve.pr.draft_status'));
    }

    return results;
  }
}
