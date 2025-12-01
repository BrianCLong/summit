/**
 * Compliance Logger - Tamper-evident audit logging for security operations
 *
 * Provides cryptographically verifiable audit trails for:
 * - Zero-trust security operations
 * - Battlefield communications compliance
 * - Regulatory compliance (NIST, SOC2, FedRAMP, etc.)
 */

import { createHash, randomUUID } from 'node:crypto';
import type { AuditEntry, Vulnerability, ScanConfig, ScanResult, ZeroTrustContext } from '../types.js';

export interface ComplianceLoggerConfig {
  serviceName: string;
  enableZeroTrust: boolean;
  retentionDays: number;
  encryptionLevel?: 'standard' | 'high' | 'classified';
  nonRepudiation?: boolean;
  geoRestrictions?: string[];
}

export interface ComplianceEvent {
  eventType: string;
  severity: 'info' | 'warning' | 'alert' | 'critical';
  framework: string;
  control: string;
  status: 'compliant' | 'non-compliant' | 'remediated';
  details: Record<string, unknown>;
}

export class ComplianceLogger {
  private config: ComplianceLoggerConfig;
  private auditChain: AuditEntry[] = [];
  private lastHash: string = '0'.repeat(64);

  constructor(config: ComplianceLoggerConfig) {
    this.config = {
      encryptionLevel: 'standard',
      nonRepudiation: true,
      ...config,
    };
  }

  /**
   * Log scan initiation with full context
   */
  async logScanStart(scanId: string, targetPath: string, config: ScanConfig): Promise<void> {
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
  async logScanComplete(scanId: string, result: ScanResult): Promise<void> {
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
  async logVulnerabilityDetected(scanId: string, vuln: Vulnerability): Promise<void> {
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
  async logRemediation(
    scanId: string,
    vulnId: string,
    action: 'started' | 'completed' | 'failed' | 'verified',
    details: Record<string, unknown>
  ): Promise<void> {
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
  async logAction(scanId: string, action: string, details: Record<string, unknown>): Promise<void> {
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
  async logError(scanId: string, message: string, error: unknown): Promise<void> {
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
  async logComplianceEvent(event: ComplianceEvent): Promise<void> {
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
  async logZeroTrustValidation(context: ZeroTrustContext, decision: 'allow' | 'deny' | 'challenge'): Promise<void> {
    if (!this.config.enableZeroTrust) return;

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
  async logBattlefieldComms(
    eventType: 'transmission' | 'receipt' | 'verification' | 'rejection',
    details: Record<string, unknown>
  ): Promise<void> {
    if (this.config.encryptionLevel !== 'classified') {
      console.warn('Battlefield comms logging requires classified encryption level');
      return;
    }

    await this.addAuditEntry({
      action: `BATTLEFIELD_COMMS_${eventType.toUpperCase()}`,
      actor: this.config.serviceName,
      target: details.messageId as string || 'unknown',
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
  async getAuditTrail(scanId?: string): Promise<AuditEntry[]> {
    if (!scanId) return [...this.auditChain];
    return this.auditChain.filter(
      (entry) => entry.target === scanId || entry.details.scanId === scanId
    );
  }

  /**
   * Verify audit chain integrity
   */
  async verifyChainIntegrity(): Promise<{ valid: boolean; brokenAt?: number }> {
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
  async exportComplianceReport(framework: string): Promise<{
    framework: string;
    generatedAt: Date;
    entries: AuditEntry[];
    summary: Record<string, number>;
    chainIntegrity: boolean;
  }> {
    const frameworkEntries = this.auditChain.filter(
      (e) => e.target.startsWith(`${framework}:`) || e.details.framework === framework
    );

    const integrity = await this.verifyChainIntegrity();

    const summary: Record<string, number> = {
      totalEvents: frameworkEntries.length,
      compliant: 0,
      nonCompliant: 0,
      remediated: 0,
    };

    for (const entry of frameworkEntries) {
      const status = entry.details.status as string;
      if (status === 'compliant') summary.compliant++;
      else if (status === 'non-compliant') summary.nonCompliant++;
      else if (status === 'remediated') summary.remediated++;
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
  private async addAuditEntry(params: {
    action: string;
    actor: string;
    target: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
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
  private computeEntryHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      action: entry.action,
      actor: entry.actor,
      target: entry.target,
      details: entry.details,
      previousHash: entry.previousHash,
    });

    return createHash('sha256').update(data).digest('hex');
  }
}
