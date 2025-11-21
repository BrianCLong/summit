/**
 * Transparency Service
 *
 * Provides public transparency reports, decision explanations,
 * and citizen-facing audit capabilities for government AI systems.
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { TransparencyReport, AIDecision, AuditEvent } from './types.js';

export interface TransparencyServiceConfig {
  agency: string;
  auditService?: { log: (event: unknown) => Promise<void> };
}

export class TransparencyService {
  private reports: Map<string, TransparencyReport> = new Map();
  private decisions: Map<string, AIDecision> = new Map();
  private auditChain: AuditEvent[] = [];
  private agency: string;
  private auditService?: { log: (event: unknown) => Promise<void> };

  constructor(config: TransparencyServiceConfig) {
    this.agency = config.agency;
    this.auditService = config.auditService;
  }

  /**
   * Record an AI-assisted decision with full explanation
   */
  async recordDecision(
    decision: Omit<AIDecision, 'decisionId' | 'madeAt'>,
  ): Promise<AIDecision> {
    const fullDecision: AIDecision = {
      ...decision,
      decisionId: uuidv4(),
      madeAt: new Date().toISOString(),
    };

    this.decisions.set(fullDecision.decisionId, fullDecision);

    await this.appendAuditEvent({
      eventType: 'decision_made',
      actorId: 'system',
      actorType: 'system',
      resourceType: 'ai_decision',
      resourceId: fullDecision.decisionId,
      details: {
        modelId: fullDecision.modelId,
        decisionType: fullDecision.decisionType,
        confidence: fullDecision.confidence,
        humanReviewRequired: fullDecision.humanReviewRequired,
      },
    });

    return fullDecision;
  }

  /**
   * Get decision details including explanation
   */
  async getDecision(decisionId: string): Promise<AIDecision | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  /**
   * Get citizen-facing explanation of a decision
   */
  async getDecisionExplanation(decisionId: string): Promise<{
    summary: string;
    factors: Array<{ factor: string; impact: string }>;
    appealInfo?: { deadline: string; process: string };
  } | null> {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    return {
      summary: decision.explanation.humanReadable,
      factors: decision.explanation.contributingFactors.map((f) => ({
        factor: f.factor,
        impact: f.direction === 'positive' ? 'Supported outcome' :
                f.direction === 'negative' ? 'Opposed outcome' : 'Neutral',
      })),
      appealInfo: decision.appealable ? {
        deadline: decision.appealDeadline ?? 'Contact agency for deadline',
        process: 'Submit appeal through citizen portal or contact agency directly',
      } : undefined,
    };
  }

  /**
   * File an appeal for a decision
   */
  async fileAppeal(
    decisionId: string,
    citizenId: string,
    grounds: string,
  ): Promise<{ appealId: string; status: string }> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error('Decision not found');
    }

    if (!decision.appealable) {
      throw new Error('This decision is not appealable');
    }

    if (decision.appealDeadline && new Date(decision.appealDeadline) < new Date()) {
      throw new Error('Appeal deadline has passed');
    }

    const appealId = uuidv4();

    await this.appendAuditEvent({
      eventType: 'decision_appealed',
      actorId: citizenId,
      actorType: 'citizen',
      resourceType: 'ai_decision',
      resourceId: decisionId,
      details: { appealId, grounds },
    });

    return { appealId, status: 'pending_review' };
  }

  /**
   * Generate transparency report for a period
   */
  async generateReport(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TransparencyReport> {
    const decisionsInPeriod = Array.from(this.decisions.values()).filter((d) => {
      const madeAt = new Date(d.madeAt);
      return madeAt >= periodStart && madeAt <= periodEnd;
    });

    const eventsInPeriod = this.auditChain.filter((e) => {
      const timestamp = new Date(e.timestamp);
      return timestamp >= periodStart && timestamp <= periodEnd;
    });

    const report: TransparencyReport = {
      reportId: uuidv4(),
      reportingPeriod: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      agency: this.agency,
      aiSystemsDeployed: new Set(decisionsInPeriod.map((d) => d.modelId)).size,
      decisionsAugmented: decisionsInPeriod.filter((d) => d.humanReviewRequired).length,
      decisionsAutomated: decisionsInPeriod.filter((d) => !d.humanReviewRequired).length,
      appealsReceived: eventsInPeriod.filter((e) => e.eventType === 'decision_appealed').length,
      appealsUpheld: eventsInPeriod.filter((e) => e.eventType === 'decision_overridden').length,
      dataAccessRequests: eventsInPeriod.filter((e) => e.eventType === 'data_accessed').length,
      dataAccessCompleted: eventsInPeriod.filter((e) => e.eventType === 'data_exported').length,
      incidentsReported: eventsInPeriod.filter((e) => e.eventType === 'bias_detected').length,
      incidentsResolved: 0, // Would need incident tracking
      biasAuditsCompleted: eventsInPeriod.filter((e) =>
        e.eventType === 'ethical_review_completed',
      ).length,
      ethicalReviewsCompleted: eventsInPeriod.filter((e) =>
        e.eventType === 'ethical_review_completed',
      ).length,
      publicConsultationsHeld: 0, // Would need consultation tracking
      generatedAt: new Date().toISOString(),
    };

    this.reports.set(report.reportId, report);

    await this.appendAuditEvent({
      eventType: 'transparency_report_published',
      actorId: 'system',
      actorType: 'system',
      resourceType: 'transparency_report',
      resourceId: report.reportId,
      details: { period: report.reportingPeriod },
    });

    return report;
  }

  /**
   * Publish a transparency report (makes it public)
   */
  async publishReport(reportId: string): Promise<TransparencyReport | null> {
    const report = this.reports.get(reportId);
    if (!report) return null;

    const published: TransparencyReport = {
      ...report,
      publishedAt: new Date().toISOString(),
    };

    this.reports.set(reportId, published);
    return published;
  }

  /**
   * Get published transparency reports
   */
  async getPublishedReports(): Promise<TransparencyReport[]> {
    return Array.from(this.reports.values()).filter((r) => r.publishedAt);
  }

  /**
   * Query audit trail with filters
   */
  async queryAuditTrail(filters: {
    eventType?: string;
    actorId?: string;
    resourceId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    let events = [...this.auditChain];

    if (filters.eventType) {
      events = events.filter((e) => e.eventType === filters.eventType);
    }

    if (filters.actorId) {
      events = events.filter((e) => e.actorId === filters.actorId);
    }

    if (filters.resourceId) {
      events = events.filter((e) => e.resourceId === filters.resourceId);
    }

    if (filters.startTime) {
      events = events.filter((e) => new Date(e.timestamp) >= filters.startTime!);
    }

    if (filters.endTime) {
      events = events.filter((e) => new Date(e.timestamp) <= filters.endTime!);
    }

    return events.slice(0, filters.limit ?? 100);
  }

  /**
   * Verify audit chain integrity
   */
  async verifyAuditIntegrity(): Promise<{
    valid: boolean;
    chainLength: number;
    brokenAt?: number;
  }> {
    for (let i = 1; i < this.auditChain.length; i++) {
      const event = this.auditChain[i];
      const previousEvent = this.auditChain[i - 1];

      if (event.previousHash !== previousEvent.currentHash) {
        return { valid: false, chainLength: this.auditChain.length, brokenAt: i };
      }
    }

    return { valid: true, chainLength: this.auditChain.length };
  }

  /**
   * Append event to immutable audit chain
   */
  private async appendAuditEvent(
    event: Omit<AuditEvent, 'eventId' | 'timestamp' | 'previousHash' | 'currentHash'>,
  ): Promise<AuditEvent> {
    const previousHash = this.auditChain.length > 0
      ? this.auditChain[this.auditChain.length - 1].currentHash
      : '0'.repeat(64);

    const eventWithMeta = {
      ...event,
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      previousHash,
    };

    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(eventWithMeta))
      .digest('hex');

    const fullEvent: AuditEvent = {
      ...eventWithMeta,
      currentHash,
    } as AuditEvent;

    this.auditChain.push(fullEvent);

    if (this.auditService) {
      await this.auditService.log(fullEvent);
    }

    return fullEvent;
  }
}
