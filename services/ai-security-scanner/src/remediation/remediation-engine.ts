/**
 * Remediation Engine - Automated vulnerability remediation
 *
 * Provides automated and assisted remediation capabilities:
 * - Automated code fixes for known vulnerability patterns
 * - Configuration remediation
 * - Dependency updates
 * - Rollback capabilities
 * - Verification testing
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import type {
  Vulnerability,
  CodeChange,
  ConfigChange,
  SeverityLevel,
  AuditEntry,
} from '../types.js';
import { ComplianceLogger } from '../compliance/compliance-logger.js';

export interface RemediationConfig {
  autoRemediate: boolean;
  autoRemediateMaxSeverity: SeverityLevel;
  requireApproval: boolean;
  createBackups: boolean;
  runVerification: boolean;
  dryRun: boolean;
}

export interface RemediationTask {
  id: string;
  vulnerabilityId: string;
  type: 'code' | 'config' | 'dependency';
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  changes: (CodeChange | ConfigChange)[];
  backup?: Backup;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  verification?: VerificationResult;
}

interface Backup {
  id: string;
  files: { path: string; content: string; hash: string }[];
  createdAt: Date;
}

interface VerificationResult {
  passed: boolean;
  tests: { name: string; passed: boolean; error?: string }[];
  timestamp: Date;
}

export interface RemediationReport {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  vulnerabilitiesRemediated: string[];
  verificationResults: VerificationResult[];
  auditTrail: AuditEntry[];
}

// Remediation patterns for common vulnerabilities
const REMEDIATION_PATTERNS: Record<string, RemediationPattern> = {
  SQL_INJECTION: {
    detect: /(\$\{.*\}|`.*\$\{.*\}`|'.*\+.*'|".*\+.*").*(?:query|execute|raw|sql)/gi,
    transform: (code: string) => {
      // Convert string concatenation to parameterized queries
      return code.replace(
        /query\s*\(\s*['"`](.+?)['"`]\s*\+\s*(\w+)\s*\+\s*['"`](.+?)['"`]\s*\)/g,
        'query($1?$3, [$2])'
      );
    },
    description: 'Convert to parameterized query',
  },
  XSS: {
    detect: /innerHTML\s*=\s*([^;]+)/g,
    transform: (code: string) => {
      return code.replace(/innerHTML\s*=\s*([^;]+)/g, 'textContent = $1');
    },
    description: 'Replace innerHTML with textContent',
  },
  WEAK_CRYPTO: {
    detect: /(?:createHash|Hash)\s*\(\s*['"](?:md5|sha1)['"]\s*\)/gi,
    transform: (code: string) => {
      return code
        .replace(/createHash\s*\(\s*['"]md5['"]\s*\)/gi, "createHash('sha256')")
        .replace(/createHash\s*\(\s*['"]sha1['"]\s*\)/gi, "createHash('sha256')");
    },
    description: 'Upgrade to SHA-256',
  },
  SENSITIVE_DATA_LOG: {
    detect: /console\.(?:log|info|debug)\s*\([^)]*(?:password|token|secret|ssn|credit)/gi,
    transform: (code: string) => {
      return code.replace(
        /console\.(log|info|debug)\s*\(([^)]*(?:password|token|secret|ssn|credit)[^)]*)\)/gi,
        'console.$1("[REDACTED]")'
      );
    },
    description: 'Redact sensitive data from logs',
  },
};

interface RemediationPattern {
  detect: RegExp;
  transform: (code: string) => string;
  description: string;
}

export class RemediationEngine {
  private config: RemediationConfig;
  private logger: ComplianceLogger;
  private tasks: Map<string, RemediationTask> = new Map();
  private backups: Map<string, Backup> = new Map();

  constructor(config: Partial<RemediationConfig> = {}) {
    this.config = {
      autoRemediate: false,
      autoRemediateMaxSeverity: 'medium',
      requireApproval: true,
      createBackups: true,
      runVerification: true,
      dryRun: false,
      ...config,
    };

    this.logger = new ComplianceLogger({
      serviceName: 'remediation-engine',
      enableZeroTrust: true,
      retentionDays: 2555,
    });
  }

  /**
   * Create remediation tasks for vulnerabilities
   */
  async createRemediationTasks(vulnerabilities: Vulnerability[]): Promise<RemediationTask[]> {
    const tasks: RemediationTask[] = [];

    for (const vuln of vulnerabilities) {
      const task = await this.createTaskForVulnerability(vuln);
      if (task) {
        tasks.push(task);
        this.tasks.set(task.id, task);

        await this.logger.logRemediation(task.id, vuln.id, 'started', {
          type: task.type,
          changesCount: task.changes.length,
        });
      }
    }

    return tasks;
  }

  /**
   * Execute remediation tasks
   */
  async executeRemediations(taskIds?: string[]): Promise<RemediationReport> {
    const sessionId = randomUUID();
    const startTime = new Date();

    const tasksToExecute = taskIds
      ? taskIds.map((id) => this.tasks.get(id)).filter(Boolean) as RemediationTask[]
      : Array.from(this.tasks.values()).filter((t) => t.status === 'pending' || t.status === 'approved');

    let completed = 0;
    let failed = 0;
    const remediated: string[] = [];
    const verifications: VerificationResult[] = [];

    for (const task of tasksToExecute) {
      try {
        // Check if approval required
        if (this.config.requireApproval && task.status === 'pending') {
          continue; // Skip unapproved tasks
        }

        // Create backup
        if (this.config.createBackups) {
          task.backup = await this.createBackup(task);
        }

        // Execute remediation
        task.status = 'in-progress';

        if (this.config.dryRun) {
          await this.simulateRemediation(task);
        } else {
          await this.applyRemediation(task);
        }

        // Run verification
        if (this.config.runVerification) {
          task.verification = await this.verifyRemediation(task);
          verifications.push(task.verification);

          if (!task.verification.passed) {
            // Rollback on failed verification
            await this.rollback(task);
            task.status = 'rolled-back';
            failed++;
            continue;
          }
        }

        task.status = 'completed';
        task.completedAt = new Date();
        completed++;
        remediated.push(task.vulnerabilityId);

        await this.logger.logRemediation(sessionId, task.vulnerabilityId, 'completed', {
          taskId: task.id,
          verification: task.verification?.passed,
        });
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        failed++;

        // Attempt rollback on error
        if (task.backup) {
          await this.rollback(task);
        }

        await this.logger.logRemediation(sessionId, task.vulnerabilityId, 'failed', {
          taskId: task.id,
          error: task.error,
        });
      }
    }

    const endTime = new Date();

    return {
      sessionId,
      startTime,
      endTime,
      tasksTotal: tasksToExecute.length,
      tasksCompleted: completed,
      tasksFailed: failed,
      vulnerabilitiesRemediated: remediated,
      verificationResults: verifications,
      auditTrail: await this.logger.getAuditTrail(sessionId),
    };
  }

  /**
   * Approve a remediation task
   */
  async approveTask(taskId: string, approver: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'approved';

    await this.logger.logAction(taskId, 'remediation-approved', {
      approver,
      vulnerabilityId: task.vulnerabilityId,
    });
  }

  /**
   * Rollback a remediation
   */
  async rollback(task: RemediationTask): Promise<void> {
    if (!task.backup) {
      throw new Error('No backup available for rollback');
    }

    for (const file of task.backup.files) {
      if (!this.config.dryRun) {
        await writeFile(file.path, file.content, 'utf-8');
      }
    }

    task.status = 'rolled-back';

    await this.logger.logRemediation(task.id, task.vulnerabilityId, 'failed', {
      reason: 'rolled-back',
      backupId: task.backup.id,
    });
  }

  /**
   * Create task for a specific vulnerability
   */
  private async createTaskForVulnerability(vuln: Vulnerability): Promise<RemediationTask | null> {
    const changes: CodeChange[] = [];

    // Find matching remediation pattern
    const patternKey = Object.keys(REMEDIATION_PATTERNS).find((key) =>
      vuln.id.startsWith(key) || vuln.title.toUpperCase().includes(key.replace(/_/g, ' '))
    );

    if (patternKey && vuln.location.file !== 'N/A - Runtime finding') {
      const pattern = REMEDIATION_PATTERNS[patternKey];

      try {
        const content = await readFile(vuln.location.file, 'utf-8');
        const transformed = pattern.transform(content);

        if (transformed !== content) {
          changes.push({
            file: vuln.location.file,
            oldCode: vuln.location.codeSnippet,
            newCode: this.extractTransformedSnippet(content, transformed, vuln.location.startLine),
            explanation: pattern.description,
          });
        }
      } catch {
        // File read failed, skip automated remediation
        return null;
      }
    }

    // Use suggested remediation if no pattern match
    if (changes.length === 0 && vuln.remediation.codeChanges) {
      changes.push(...vuln.remediation.codeChanges);
    }

    if (changes.length === 0) {
      return null; // No automated remediation available
    }

    return {
      id: randomUUID(),
      vulnerabilityId: vuln.id,
      type: 'code',
      status: this.shouldAutoApprove(vuln) ? 'approved' : 'pending',
      changes,
      createdAt: new Date(),
    };
  }

  /**
   * Check if vulnerability should be auto-approved
   */
  private shouldAutoApprove(vuln: Vulnerability): boolean {
    if (!this.config.autoRemediate) return false;

    const severityOrder: SeverityLevel[] = ['info', 'low', 'medium', 'high', 'critical'];
    const maxIndex = severityOrder.indexOf(this.config.autoRemediateMaxSeverity);
    const vulnIndex = severityOrder.indexOf(vuln.severity);

    return vulnIndex <= maxIndex;
  }

  /**
   * Create backup of files to be modified
   */
  private async createBackup(task: RemediationTask): Promise<Backup> {
    const files: Backup['files'] = [];

    for (const change of task.changes) {
      if ('file' in change) {
        try {
          const content = await readFile(change.file, 'utf-8');
          files.push({
            path: change.file,
            content,
            hash: createHash('sha256').update(content).digest('hex'),
          });
        } catch {
          // File doesn't exist or can't be read
        }
      }
    }

    const backup: Backup = {
      id: randomUUID(),
      files,
      createdAt: new Date(),
    };

    this.backups.set(backup.id, backup);
    return backup;
  }

  /**
   * Apply remediation changes to files
   */
  private async applyRemediation(task: RemediationTask): Promise<void> {
    for (const change of task.changes) {
      if ('file' in change && 'oldCode' in change && 'newCode' in change) {
        const content = await readFile(change.file, 'utf-8');
        const updated = content.replace(change.oldCode, change.newCode);
        await writeFile(change.file, updated, 'utf-8');
      }
    }
  }

  /**
   * Simulate remediation without making changes
   */
  private async simulateRemediation(task: RemediationTask): Promise<void> {
    for (const change of task.changes) {
      await this.logger.logAction(task.id, 'dry-run-change', {
        type: task.type,
        change,
      });
    }
  }

  /**
   * Verify remediation was successful
   */
  private async verifyRemediation(task: RemediationTask): Promise<VerificationResult> {
    const tests: VerificationResult['tests'] = [];

    // Verify file was changed correctly
    for (const change of task.changes) {
      if ('file' in change && 'newCode' in change) {
        try {
          const content = await readFile(change.file, 'utf-8');
          const hasNewCode = content.includes(change.newCode);
          const hasOldCode = content.includes(change.oldCode);

          tests.push({
            name: `File change: ${change.file}`,
            passed: hasNewCode && !hasOldCode,
            error: !hasNewCode ? 'New code not found' : hasOldCode ? 'Old code still present' : undefined,
          });
        } catch (error) {
          tests.push({
            name: `File change: ${change.file}`,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return {
      passed: tests.every((t) => t.passed),
      tests,
      timestamp: new Date(),
    };
  }

  /**
   * Extract transformed code snippet around the vulnerability
   */
  private extractTransformedSnippet(original: string, transformed: string, line: number): string {
    const lines = transformed.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Get task status
   */
  getTask(taskId: string): RemediationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): RemediationTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get pending tasks requiring approval
   */
  getPendingTasks(): RemediationTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }
}
