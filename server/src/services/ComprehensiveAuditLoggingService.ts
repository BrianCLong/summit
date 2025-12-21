import { verify } from 'jsonwebtoken';
import { Logger } from 'pino';
import {
  AdvancedAuditSystem,
  AuditEvent,
  AuditLevel,
  AuditQuery,
  ComplianceFramework,
  ComplianceReport,
} from '../audit/advanced-audit-system.js';
import { WORMAuditChainService } from '../federal/worm-audit-chain.js';
import logger from '../config/logger.js';

export interface AuditRecordInput
  extends Pick<
    AuditEvent,
    | 'eventType'
    | 'action'
    | 'tenantId'
    | 'serviceId'
    | 'correlationId'
    | 'message'
    | 'outcome'
  > {
  userId?: string;
  level?: AuditLevel;
  details?: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  sessionId?: string;
  requestId?: string;
  complianceFrameworks?: ComplianceFramework[];
  complianceRelevant?: boolean;
  ipAddress?: string;
  userAgent?: string;
  dataClassification?: AuditEvent['dataClassification'];
}

export interface TamperProofResult {
  valid: boolean;
  totalEvents: number;
  failures: Array<{ index: number; eventId: string; reason: string }>;
}

export interface ComplianceEvidence {
  report: ComplianceReport;
  integrity: TamperProofResult;
}

export interface ComprehensiveAuditOptions {
  signingKey: string;
  logger?: Logger;
  worm?: WORMAuditChainService;
}

export class ComprehensiveAuditLoggingService {
  private readonly logger: Logger;
  private readonly signingKey: string;
  private readonly worm?: WORMAuditChainService;

  constructor(
    private readonly auditSystem: Pick<
      AdvancedAuditSystem,
      'recordEvent' | 'queryEvents' | 'generateComplianceReport'
    >,
    options: ComprehensiveAuditOptions,
  ) {
    this.signingKey = options.signingKey;
    this.logger = options.logger ?? logger.child({ name: 'ComprehensiveAudit' });
    this.worm = options.worm;
  }

  async recordComprehensiveEvent(input: AuditRecordInput): Promise<{
    eventId: string;
  }> {
    const enrichedEvent: Partial<AuditEvent> = {
      ...input,
      level: input.level ?? 'info',
      details: input.details ?? {},
      complianceRelevant: input.complianceRelevant ?? true,
      complianceFrameworks: input.complianceFrameworks ?? ['SOC2'],
      timestamp: new Date(),
    };

    const eventId = await this.auditSystem.recordEvent(enrichedEvent);

    if (this.worm) {
      await this.worm.addAuditEntry({
        userId: input.userId || 'system',
        action: input.action,
        eventType: input.eventType,
        resource: input.resourceId || input.resourceType || 'unknown',
        details: input.details ?? {},
        classification: input.dataClassification || 'internal',
        sessionId: input.sessionId,
      });
    }

    this.logger.debug(
      { eventId, eventType: input.eventType, tenantId: input.tenantId },
      'Audit event recorded with tamper-proof trail',
    );

    return { eventId };
  }

  async verifyTamperProofTrail(query: AuditQuery): Promise<TamperProofResult> {
    const events = await this.auditSystem.queryEvents(query);
    const ordered = [...events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const failures: TamperProofResult['failures'] = [];
    let previousHash: string | undefined;

    ordered.forEach((event, index) => {
      if (!event.hash) {
        failures.push({ index, eventId: event.id, reason: 'missing_hash' });
        return;
      }

      if (previousHash && event.previousEventHash !== previousHash) {
        failures.push({
          index,
          eventId: event.id,
          reason: 'hash_chain_mismatch',
        });
      }

      if (event.signature) {
        try {
          verify(event.signature, this.signingKey);
        } catch (error) {
          failures.push({
            index,
            eventId: event.id,
            reason: 'invalid_signature',
          });
        }
      } else {
        failures.push({ index, eventId: event.id, reason: 'missing_signature' });
      }

      previousHash = event.hash;
    });

    return {
      valid: failures.length === 0,
      totalEvents: ordered.length,
      failures,
    };
  }

  async generateComplianceEvidence(
    framework: ComplianceFramework,
    start: Date,
    end: Date,
    queryOverrides: Partial<AuditQuery> = {},
  ): Promise<ComplianceEvidence> {
    const [report, integrity] = await Promise.all([
      this.auditSystem.generateComplianceReport(framework, start, end),
      this.verifyTamperProofTrail({
        startTime: start,
        endTime: end,
        ...queryOverrides,
      }),
    ]);

    return { report, integrity };
  }
}
