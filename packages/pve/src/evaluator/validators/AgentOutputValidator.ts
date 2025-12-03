/**
 * Agent Output Validator
 *
 * Validates output from AI agents (Claude, Jules, Codex, etc.).
 *
 * @module pve/evaluator/validators/AgentOutputValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  AgentOutputInput,
  AgentFile,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface AgentOutputValidatorConfig {
  /** Maximum response length */
  maxResponseLength?: number;
  /** Maximum file size agents can create */
  maxFileSize?: number;
  /** Maximum number of files per output */
  maxFiles?: number;
  /** Forbidden file paths */
  forbiddenPaths?: string[];
  /** Required patterns in output */
  requiredPatterns?: RegExp[];
  /** Forbidden patterns in output */
  forbiddenPatterns?: ForbiddenPattern[];
  /** File type restrictions */
  allowedFileTypes?: string[];
  /** Code quality checks */
  codeQuality?: CodeQualityConfig;
}

export interface ForbiddenPattern {
  pattern: RegExp;
  message: string;
  severity?: 'error' | 'warning';
}

export interface CodeQualityConfig {
  /** Check for console.log statements */
  noConsoleLogs?: boolean;
  /** Check for TODO/FIXME comments */
  noTodos?: boolean;
  /** Check for hardcoded values */
  noHardcodedSecrets?: boolean;
  /** Maximum function length */
  maxFunctionLength?: number;
  /** Maximum file length */
  maxFileLength?: number;
}

const DEFAULT_CONFIG: AgentOutputValidatorConfig = {
  maxResponseLength: 100000, // 100KB
  maxFileSize: 50000, // 50KB
  maxFiles: 20,
  forbiddenPaths: [
    '.env',
    '.env.local',
    '.env.production',
    'credentials.json',
    'secrets.yaml',
    '.git/',
    'node_modules/',
  ],
  forbiddenPatterns: [
    {
      pattern: /TODO(?:\s*:|\s+)/i,
      message: 'Agent output contains TODO comments',
      severity: 'warning',
    },
    {
      pattern: /FIXME(?:\s*:|\s+)/i,
      message: 'Agent output contains FIXME comments',
      severity: 'warning',
    },
    {
      pattern: /password\s*[:=]\s*["'][^"']+["']/i,
      message: 'Agent output may contain hardcoded password',
      severity: 'error',
    },
  ],
  codeQuality: {
    noConsoleLogs: true,
    noTodos: true,
    noHardcodedSecrets: true,
    maxFunctionLength: 100,
    maxFileLength: 500,
  },
};

export class AgentOutputValidator {
  private config: AgentOutputValidatorConfig;

  constructor(config: AgentOutputValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'agent_output') {
      return [];
    }

    const input = context.input as AgentOutputInput;
    const results: PolicyResult[] = [];

    // Validate response length
    if (input.output.response) {
      results.push(...this.validateResponseLength(input.output.response));
    }

    // Validate files
    if (input.output.files) {
      results.push(...this.validateFiles(input.output.files));
      results.push(...this.validateFileContent(input.output.files));
    }

    // Check forbidden patterns in all content
    results.push(...this.checkForbiddenPatterns(input));

    // Validate task alignment
    if (input.task) {
      results.push(...this.validateTaskAlignment(input));
    }

    // Agent-specific validations
    results.push(...this.validateAgentSpecific(input));

    return results;
  }

  private validateResponseLength(response: string): PolicyResult[] {
    const results: PolicyResult[] = [];

    if (this.config.maxResponseLength && response.length > this.config.maxResponseLength) {
      results.push(
        warn('pve.agent.response_length', `Response exceeds maximum length of ${this.config.maxResponseLength} characters`, {
          details: { actual: response.length, maximum: this.config.maxResponseLength },
        }),
      );
    } else {
      results.push(pass('pve.agent.response_length'));
    }

    return results;
  }

  private validateFiles(files: AgentFile[]): PolicyResult[] {
    const results: PolicyResult[] = [];

    // Check file count
    if (this.config.maxFiles && files.length > this.config.maxFiles) {
      results.push(
        fail('pve.agent.max_files', `Agent created ${files.length} files, exceeding maximum of ${this.config.maxFiles}`, {
          severity: 'warning',
          details: { actual: files.length, maximum: this.config.maxFiles },
        }),
      );
    } else {
      results.push(pass('pve.agent.max_files'));
    }

    // Check each file
    for (const file of files) {
      // Check forbidden paths
      for (const forbidden of this.config.forbiddenPaths || []) {
        if (file.path.includes(forbidden) || file.path.startsWith(forbidden)) {
          results.push(
            fail('pve.agent.forbidden_path', `Agent attempted to modify forbidden path: ${file.path}`, {
              severity: 'error',
              location: { file: file.path },
            }),
          );
        }
      }

      // Check file size
      if (this.config.maxFileSize && file.content.length > this.config.maxFileSize) {
        results.push(
          warn('pve.agent.file_size', `File "${file.path}" exceeds maximum size of ${this.config.maxFileSize} bytes`, {
            location: { file: file.path },
            details: { actual: file.content.length, maximum: this.config.maxFileSize },
          }),
        );
      }

      // Check allowed file types
      if (this.config.allowedFileTypes && this.config.allowedFileTypes.length > 0) {
        const ext = file.path.split('.').pop() || '';
        if (!this.config.allowedFileTypes.includes(ext)) {
          results.push(
            warn('pve.agent.file_type', `File type ".${ext}" is not in allowed list`, {
              location: { file: file.path },
              details: { actual: ext, allowed: this.config.allowedFileTypes },
            }),
          );
        }
      }
    }

    return results;
  }

  private validateFileContent(files: AgentFile[]): PolicyResult[] {
    const results: PolicyResult[] = [];
    const cq = this.config.codeQuality;

    if (!cq) {
      return results;
    }

    for (const file of files) {
      const isCodeFile = /\.(ts|tsx|js|jsx|py|go|java|rb|rs)$/.test(file.path);
      if (!isCodeFile) continue;

      const lines = file.content.split('\n');

      // Check file length
      if (cq.maxFileLength && lines.length > cq.maxFileLength) {
        results.push(
          warn('pve.agent.file_length', `File "${file.path}" has ${lines.length} lines, exceeding maximum of ${cq.maxFileLength}`, {
            location: { file: file.path },
            fix: 'Consider splitting into smaller modules',
          }),
        );
      }

      // Check for console.log
      if (cq.noConsoleLogs) {
        const consoleMatches = file.content.match(/console\.(log|debug|info|warn|error)\(/g);
        if (consoleMatches && consoleMatches.length > 0) {
          results.push(
            warn('pve.agent.console_logs', `File "${file.path}" contains ${consoleMatches.length} console statements`, {
              location: { file: file.path },
              fix: 'Use a proper logging library instead of console.log',
            }),
          );
        }
      }

      // Check for hardcoded secrets
      if (cq.noHardcodedSecrets) {
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i,
          /secret\s*[:=]\s*["'][^"']{10,}["']/i,
          /password\s*[:=]\s*["'][^"']{4,}["']/i,
          /token\s*[:=]\s*["'][^"']{10,}["']/i,
        ];

        for (const pattern of secretPatterns) {
          if (pattern.test(file.content)) {
            results.push(
              fail('pve.agent.hardcoded_secret', `File "${file.path}" may contain hardcoded secrets`, {
                severity: 'error',
                location: { file: file.path },
                fix: 'Use environment variables or a secrets manager',
              }),
            );
            break;
          }
        }
      }

      // Check function length (simplified heuristic)
      if (cq.maxFunctionLength) {
        const functionMatch = file.content.match(/(function\s+\w+|(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>)[^{]*\{/g);
        // This is a simplified check - in production, use AST parsing
      }
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.agent.code_quality'));
    }

    return results;
  }

  private checkForbiddenPatterns(input: AgentOutputInput): PolicyResult[] {
    const results: PolicyResult[] = [];
    const allContent: string[] = [];

    if (input.output.response) {
      allContent.push(input.output.response);
    }

    if (input.output.files) {
      for (const file of input.output.files) {
        allContent.push(file.content);
      }
    }

    const combined = allContent.join('\n');

    for (const fp of this.config.forbiddenPatterns || []) {
      if (fp.pattern.test(combined)) {
        results.push(
          fail('pve.agent.forbidden_pattern', fp.message, {
            severity: fp.severity || 'warning',
          }),
        );
      }
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.agent.forbidden_patterns'));
    }

    return results;
  }

  private validateTaskAlignment(input: AgentOutputInput): PolicyResult[] {
    const results: PolicyResult[] = [];
    const task = input.task!;

    // Check if output addresses the task (simplified check)
    if (task.constraints) {
      for (const constraint of task.constraints) {
        // This is a placeholder - in production, use semantic analysis
        if (!this.outputMeetsConstraint(input.output, constraint)) {
          results.push(
            warn('pve.agent.constraint_violation', `Output may not meet constraint: ${constraint}`, {
              details: { constraint },
            }),
          );
        }
      }
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.agent.task_alignment'));
    }

    return results;
  }

  private outputMeetsConstraint(
    _output: AgentOutputInput['output'],
    _constraint: string,
  ): boolean {
    // Placeholder - implement semantic analysis
    return true;
  }

  private validateAgentSpecific(input: AgentOutputInput): PolicyResult[] {
    const results: PolicyResult[] = [];

    switch (input.agentType) {
      case 'claude':
        // Claude-specific validations
        break;
      case 'jules':
        // Jules-specific validations
        break;
      case 'codex':
        // Codex-specific validations
        break;
    }

    return results;
  }
}
