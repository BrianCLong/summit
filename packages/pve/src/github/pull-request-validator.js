"use strict";
/**
 * Pull Request Validator
 *
 * Validates pull requests against governance policies.
 *
 * @module pve/github/pull-request-validator
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRValidator = void 0;
exports.createPRValidator = createPRValidator;
const PolicyEngine_js_1 = require("../evaluator/PolicyEngine.js");
const diff_parser_js_1 = require("./diff-parser.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Pull Request Validator
 */
class PRValidator {
    config;
    engine;
    constructor(config = {}) {
        this.config = config;
        this.engine = new PolicyEngine_js_1.PolicyEngine(config);
    }
    /**
     * Validate a PR from diff string
     */
    async validateDiff(diffString, metadata, base = 'main', head = 'HEAD') {
        const parsed = (0, diff_parser_js_1.parseDiff)(diffString);
        const files = parsed.files.map(diff_parser_js_1.toPRFile);
        return this.validate(files, metadata, base, head);
    }
    /**
     * Validate a PR from file list
     */
    async validate(files, metadata, base = 'main', head = 'HEAD') {
        const input = {
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
        const context = {
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
    async validateFromGitHub(prNumber, octokit) {
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
            const files = prFiles.map((f) => ({
                path: f.filename,
                previousPath: f.previous_filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch,
            }));
            const metadata = {
                title: pr.title,
                body: pr.body || undefined,
                author: pr.user?.login || 'unknown',
                labels: pr.labels?.map((l) => l.name) || [],
                reviewers: pr.requested_reviewers?.map((r) => r.login) || [],
                isDraft: pr.draft || false,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
            };
            const result = await this.validate(files, metadata, pr.base.ref, pr.head.sha);
            result.prNumber = prNumber;
            result.sha = pr.head.sha;
            return result;
        }
        catch (error) {
            logger_js_1.logger.error('Failed to validate PR from GitHub', {
                prNumber,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Create GitHub Check Run
     */
    async createCheckRun(result, octokit) {
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
        logger_js_1.logger.info('Created check run', {
            sha: result.sha,
            passed: result.passed,
        });
    }
    /**
     * Post PR comment with results
     */
    async postComment(prNumber, result, octokit) {
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
        logger_js_1.logger.info('Posted PR comment', { prNumber });
    }
    /**
     * Build check run output
     */
    buildCheckRunOutput(results, passed) {
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
        const textLines = [];
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
        const annotations = results
            .filter((r) => !r.allowed && r.location?.file && r.location?.line)
            .map((r) => ({
            path: r.location.file,
            start_line: r.location.line,
            end_line: r.location.line,
            annotation_level: r.severity === 'error'
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
    buildCommentBody(result) {
        const lines = [
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
    async createOctokit() {
        // Dynamic import to avoid requiring @octokit/rest
        try {
            const { Octokit } = await Promise.resolve().then(() => __importStar(require('@octokit/rest')));
            return new Octokit({ auth: this.config.githubToken });
        }
        catch {
            throw new Error('@octokit/rest is not installed. Install it with: pnpm add @octokit/rest');
        }
    }
}
exports.PRValidator = PRValidator;
/**
 * Create a PR validator instance
 */
function createPRValidator(config) {
    return new PRValidator(config);
}
