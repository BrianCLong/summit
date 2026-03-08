"use strict";
/**
 * Compliance Logger - Tamper-evident audit logging for security operations
 *
 * Provides cryptographically verifiable audit trails for:
 * - Zero-trust security operations
 * - Battlefield communications compliance
 * - Regulatory compliance (NIST, SOC2, FedRAMP, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceLogger = void 0;
const node_crypto_1 = require("node:crypto");
class ComplianceLogger {
    config;
    auditChain = [];
    lastHash = '0'.repeat(64);
    constructor(config) {
        this.config = {
            encryptionLevel: 'standard',
            nonRepudiation: true,
            ...config,
        };
    }
    /**
     * Log scan initiation with full context
     */
    async logScanStart(scanId, targetPath, config) {
        await this.addAuditEntry({
            action: 'SCAN_INITIATED',
            actor: this.config.serviceName,
            target: targetPath,
            details: {
                scanId,
                scanTypes: config.scanTypes,
                complianceFrameworks: config.complianceFrameworks,
                enableAIAnalysis: config.enableAIAnalysis,
                enableRedTeam: config.enableRedTeam,
            },
        });
    }
    /**
     * Log scan completion with results summary
     */
    async logScanComplete(scanId, result) {
        await this.addAuditEntry({
            action: 'SCAN_COMPLETED',
            actor: this.config.serviceName,
            target: scanId,
            details: {
                status: result.status,
                duration: result.endTime.getTime() - result.startTime.getTime(),
                vulnerabilitiesFound: result.vulnerabilities.length,
                summary: result.summary,
                complianceScore: result.complianceReport.overallScore,
            },
        });
    }
    /**
     * Log individual vulnerability detection
     */
    async logVulnerabilityDetected(scanId, vuln) {
        await this.addAuditEntry({
            action: 'VULNERABILITY_DETECTED',
            actor: this.config.serviceName,
            target: vuln.location.file,
            details: {
                scanId,
                vulnerabilityId: vuln.id,
                title: vuln.title,
                severity: vuln.severity,
                category: vuln.category,
                cvssScore: vuln.cvssScore,
                cweId: vuln.cweId,
                line: vuln.location.startLine,
                attribution: vuln.attribution.source,
                confidence: vuln.attribution.confidence,
            },
        });
        // Log compliance impact separately for each framework
        for (const impact of vuln.complianceImpact) {
            await this.logComplianceEvent({
                eventType: 'vulnerability-compliance-impact',
                severity: vuln.severity === 'critical' ? 'critical' : 'alert',
                framework: impact.framework,
                control: impact.control,
                status: 'non-compliant',
                details: {
                    vulnerabilityId: vuln.id,
                    impact: impact.impact,
                    description: impact.description,
                },
            });
        }
    }
    /**
     * Log remediation action
     */
    async logRemediation(scanId, vulnId, action, details) {
        await this.addAuditEntry({
            action: `REMEDIATION_${action.toUpperCase()}`,
            actor: this.config.serviceName,
            target: vulnId,
            details: {
                scanId,
                ...details,
            },
        });
    }
    /**
     * Log generic action
     */
    async logAction(scanId, action, details) {
        await this.addAuditEntry({
            action: action.toUpperCase().replace(/-/g, '_'),
            actor: this.config.serviceName,
            target: scanId,
            details,
        });
    }
    /**
     * Log error
     */
    async logError(scanId, message, error) {
        await this.addAuditEntry({
            action: 'ERROR',
            actor: this.config.serviceName,
            target: scanId,
            details: {
                message,
                error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
            },
        });
    }
    /**
     * Log compliance-specific event
     */
    async logComplianceEvent(event) {
        await this.addAuditEntry({
            action: `COMPLIANCE_${event.eventType.toUpperCase().replace(/-/g, '_')}`,
            actor: this.config.serviceName,
            target: `${event.framework}:${event.control}`,
            details: {
                ...event,
                timestamp: new Date().toISOString(),
            },
        });
    }
    /**
     * Log zero-trust context validation
     */
    async logZeroTrustValidation(context, decision) {
        if (!this.config.enableZeroTrust) {
            return;
        }
        await this.addAuditEntry({
            action: 'ZERO_TRUST_VALIDATION',
            actor: context.userId,
            target: context.sessionId,
            details: {
                decision,
                deviceId: context.deviceId,
                location: context.location,
                riskScore: context.riskScore,
                permissions: context.permissions,
                authenticatedAt: context.authenticatedAt,
            },
        });
    }
    /**
     * Log battlefield communications event (for classified environments)
     */
    async logBattlefieldComms(eventType, details) {
        if (this.config.encryptionLevel !== 'classified') {
            console.warn('Battlefield comms logging requires classified encryption level');
            return;
        }
        await this.addAuditEntry({
            action: `BATTLEFIELD_COMMS_${eventType.toUpperCase()}`,
            actor: this.config.serviceName,
            target: details.messageId || 'unknown',
            details: {
                ...details,
                classification: 'CLASSIFIED',
                nonRepudiation: this.config.nonRepudiation,
                geoRestrictions: this.config.geoRestrictions,
            },
        });
    }
    /**
     * Get audit trail for a scan
     */
    async getAuditTrail(scanId) {
        if (!scanId) {
            return [...this.auditChain];
        }
        return this.auditChain.filter((entry) => entry.target === scanId || entry.details.scanId === scanId);
    }
    /**
     * Verify audit chain integrity
     */
    async verifyChainIntegrity() {
        let expectedHash = '0'.repeat(64);
        for (let i = 0; i < this.auditChain.length; i++) {
            const entry = this.auditChain[i];
            if (entry.previousHash !== expectedHash) {
                return { valid: false, brokenAt: i };
            }
            const computedHash = this.computeEntryHash(entry);
            if (entry.hash !== computedHash) {
                return { valid: false, brokenAt: i };
            }
            expectedHash = entry.hash;
        }
        return { valid: true };
    }
    /**
     * Export compliance report for regulatory submission
     */
    async exportComplianceReport(framework) {
        const frameworkEntries = this.auditChain.filter((e) => e.target.startsWith(`${framework}:`) || e.details.framework === framework);
        const integrity = await this.verifyChainIntegrity();
        const summary = {
            totalEvents: frameworkEntries.length,
            compliant: 0,
            nonCompliant: 0,
            remediated: 0,
        };
        for (const entry of frameworkEntries) {
            const status = entry.details.status;
            if (status === 'compliant') {
                summary.compliant++;
            }
            else if (status === 'non-compliant') {
                summary.nonCompliant++;
            }
            else if (status === 'remediated') {
                summary.remediated++;
            }
        }
        return {
            framework,
            generatedAt: new Date(),
            entries: frameworkEntries,
            summary,
            chainIntegrity: integrity.valid,
        };
    }
    /**
     * Add entry to audit chain with cryptographic linking
     */
    async addAuditEntry(params) {
        const entry = {
            id: (0, node_crypto_1.randomUUID)(),
            timestamp: new Date(),
            action: params.action,
            actor: params.actor,
            target: params.target,
            details: params.details,
            previousHash: this.lastHash,
            hash: '', // Will be computed
        };
        entry.hash = this.computeEntryHash(entry);
        this.lastHash = entry.hash;
        this.auditChain.push(entry);
        // In production, would persist to immutable storage (auditlake, etc.)
    }
    /**
     * Compute SHA-256 hash for audit entry
     */
    computeEntryHash(entry) {
        const data = JSON.stringify({
            id: entry.id,
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            actor: entry.actor,
            target: entry.target,
            details: entry.details,
            previousHash: entry.previousHash,
        });
        return (0, node_crypto_1.createHash)('sha256').update(data).digest('hex');
    }
}
exports.ComplianceLogger = ComplianceLogger;
