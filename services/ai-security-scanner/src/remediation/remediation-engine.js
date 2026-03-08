"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemediationEngine = void 0;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const compliance_logger_js_1 = require("../compliance/compliance-logger.js");
// Remediation patterns for common vulnerabilities
const REMEDIATION_PATTERNS = {
    SQL_INJECTION: {
        detect: /(\$\{.*\}|`.*\$\{.*\}`|'.*\+.*'|".*\+.*").*(?:query|execute|raw|sql)/gi,
        transform: (code) => {
            // Convert string concatenation to parameterized queries
            return code.replace(/query\s*\(\s*['"`](.+?)['"`]\s*\+\s*(\w+)\s*\+\s*['"`](.+?)['"`]\s*\)/g, 'query($1?$3, [$2])');
        },
        description: 'Convert to parameterized query',
    },
    XSS: {
        detect: /innerHTML\s*=\s*([^;]+)/g,
        transform: (code) => {
            return code.replace(/innerHTML\s*=\s*([^;]+)/g, 'textContent = $1');
        },
        description: 'Replace innerHTML with textContent',
    },
    WEAK_CRYPTO: {
        detect: /(?:createHash|Hash)\s*\(\s*['"](?:md5|sha1)['"]\s*\)/gi,
        transform: (code) => {
            return code
                .replace(/createHash\s*\(\s*['"]md5['"]\s*\)/gi, "createHash('sha256')")
                .replace(/createHash\s*\(\s*['"]sha1['"]\s*\)/gi, "createHash('sha256')");
        },
        description: 'Upgrade to SHA-256',
    },
    SENSITIVE_DATA_LOG: {
        detect: /console\.(?:log|info|debug)\s*\([^)]*(?:password|token|secret|ssn|credit)/gi,
        transform: (code) => {
            return code.replace(/console\.(log|info|debug)\s*\(([^)]*(?:password|token|secret|ssn|credit)[^)]*)\)/gi, 'console.$1("[REDACTED]")');
        },
        description: 'Redact sensitive data from logs',
    },
};
class RemediationEngine {
    config;
    logger;
    tasks = new Map();
    backups = new Map();
    constructor(config = {}) {
        this.config = {
            autoRemediate: false,
            autoRemediateMaxSeverity: 'medium',
            requireApproval: true,
            createBackups: true,
            runVerification: true,
            dryRun: false,
            ...config,
        };
        this.logger = new compliance_logger_js_1.ComplianceLogger({
            serviceName: 'remediation-engine',
            enableZeroTrust: true,
            retentionDays: 2555,
        });
    }
    /**
     * Create remediation tasks for vulnerabilities
     */
    async createRemediationTasks(vulnerabilities) {
        const tasks = [];
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
    async executeRemediations(taskIds) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const startTime = new Date();
        const tasksToExecute = taskIds
            ? taskIds.map((id) => this.tasks.get(id)).filter(Boolean)
            : Array.from(this.tasks.values()).filter((t) => t.status === 'pending' || t.status === 'approved');
        let completed = 0;
        let failed = 0;
        const remediated = [];
        const verifications = [];
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
                }
                else {
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
            }
            catch (error) {
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
    async approveTask(taskId, approver) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        task.status = 'approved';
        await this.logger.logAction(taskId, 'remediation-approved', {
            approver,
            vulnerabilityId: task.vulnerabilityId,
        });
    }
    /**
     * Rollback a remediation
     */
    async rollback(task) {
        if (!task.backup) {
            throw new Error('No backup available for rollback');
        }
        for (const file of task.backup.files) {
            if (!this.config.dryRun) {
                await (0, promises_1.writeFile)(file.path, file.content, 'utf-8');
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
    async createTaskForVulnerability(vuln) {
        const changes = [];
        // Find matching remediation pattern
        const patternKey = Object.keys(REMEDIATION_PATTERNS).find((key) => vuln.id.startsWith(key) || vuln.title.toUpperCase().includes(key.replace(/_/g, ' ')));
        if (patternKey && vuln.location.file !== 'N/A - Runtime finding') {
            const pattern = REMEDIATION_PATTERNS[patternKey];
            try {
                const content = await (0, promises_1.readFile)(vuln.location.file, 'utf-8');
                const transformed = pattern.transform(content);
                if (transformed !== content) {
                    changes.push({
                        file: vuln.location.file,
                        oldCode: vuln.location.codeSnippet,
                        newCode: this.extractTransformedSnippet(content, transformed, vuln.location.startLine),
                        explanation: pattern.description,
                    });
                }
            }
            catch {
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
            id: (0, node_crypto_1.randomUUID)(),
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
    shouldAutoApprove(vuln) {
        if (!this.config.autoRemediate) {
            return false;
        }
        const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
        const maxIndex = severityOrder.indexOf(this.config.autoRemediateMaxSeverity);
        const vulnIndex = severityOrder.indexOf(vuln.severity);
        return vulnIndex <= maxIndex;
    }
    /**
     * Create backup of files to be modified
     */
    async createBackup(task) {
        const files = [];
        for (const change of task.changes) {
            if ('file' in change) {
                try {
                    const content = await (0, promises_1.readFile)(change.file, 'utf-8');
                    files.push({
                        path: change.file,
                        content,
                        hash: (0, node_crypto_1.createHash)('sha256').update(content).digest('hex'),
                    });
                }
                catch {
                    // File doesn't exist or can't be read
                }
            }
        }
        const backup = {
            id: (0, node_crypto_1.randomUUID)(),
            files,
            createdAt: new Date(),
        };
        this.backups.set(backup.id, backup);
        return backup;
    }
    /**
     * Apply remediation changes to files
     */
    async applyRemediation(task) {
        for (const change of task.changes) {
            if ('file' in change && 'oldCode' in change && 'newCode' in change) {
                const content = await (0, promises_1.readFile)(change.file, 'utf-8');
                const updated = content.replace(change.oldCode, change.newCode);
                await (0, promises_1.writeFile)(change.file, updated, 'utf-8');
            }
        }
    }
    /**
     * Simulate remediation without making changes
     */
    async simulateRemediation(task) {
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
    async verifyRemediation(task) {
        const tests = [];
        // Verify file was changed correctly
        for (const change of task.changes) {
            if ('file' in change && 'newCode' in change) {
                try {
                    const content = await (0, promises_1.readFile)(change.file, 'utf-8');
                    const hasNewCode = content.includes(change.newCode);
                    const hasOldCode = content.includes(change.oldCode);
                    tests.push({
                        name: `File change: ${change.file}`,
                        passed: hasNewCode && !hasOldCode,
                        error: !hasNewCode ? 'New code not found' : hasOldCode ? 'Old code still present' : undefined,
                    });
                }
                catch (error) {
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
    extractTransformedSnippet(original, transformed, line) {
        const lines = transformed.split('\n');
        const start = Math.max(0, line - 3);
        const end = Math.min(lines.length, line + 2);
        return lines.slice(start, end).join('\n');
    }
    /**
     * Get task status
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * Get pending tasks requiring approval
     */
    getPendingTasks() {
        return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
    }
}
exports.RemediationEngine = RemediationEngine;
