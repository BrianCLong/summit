/**
 * Zero-Trust SIEM Integration for IntelGraph
 * Audit logging and security event forwarding for air-gapped deployments
 */

import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SecurityEvent {
  id: string;
  timestamp: number;
  eventType: SecurityEventType;
  severity: Severity;
  source: EventSource;
  actor: Actor;
  action: Action;
  resource: Resource;
  outcome: Outcome;
  context: EventContext;
  zeroTrust: ZeroTrustMetadata;
  compliance: ComplianceMetadata;
  rawData?: Record<string, unknown>;
}

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'policy_decision'
  | 'network_access'
  | 'data_access'
  | 'configuration_change'
  | 'privilege_escalation'
  | 'anomaly_detection'
  | 'threat_detection'
  | 'compliance_violation'
  | 'workload_identity'
  | 'secret_access'
  | 'container_event'
  | 'file_integrity';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface EventSource {
  type: 'opa' | 'falco' | 'spire' | 'application' | 'kubernetes' | 'network';
  component: string;
  hostname: string;
  podName?: string;
  namespace?: string;
  containerId?: string;
}

export interface Actor {
  type: 'user' | 'service' | 'workload' | 'system';
  id: string;
  spiffeId?: string;
  roles?: string[];
  clearanceLevel?: number;
  sessionId?: string;
}

export interface Action {
  type: string;
  method?: string;
  path?: string;
  command?: string;
  parameters?: Record<string, unknown>;
}

export interface Resource {
  type: string;
  id: string;
  name?: string;
  namespace?: string;
  classification?: string;
  owner?: string;
}

export interface Outcome {
  result: 'success' | 'failure' | 'denied' | 'error';
  reason?: string;
  policyViolations?: string[];
  errorCode?: string;
}

export interface EventContext {
  sourceIp: string;
  destinationIp?: string;
  sourcePort?: number;
  destinationPort?: number;
  protocol?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  parentEventId?: string;
}

export interface ZeroTrustMetadata {
  trustScore: number;
  identityVerified: boolean;
  deviceTrusted: boolean;
  sessionFresh: boolean;
  mfaVerified: boolean;
  policyDecision: 'allow' | 'deny' | 'challenge';
  enforcementPoint: string;
}

export interface ComplianceMetadata {
  frameworks: string[];
  controls: string[];
  dataClassification?: string;
  retentionRequired: boolean;
  auditRequired: boolean;
}

export interface SIEMConfig {
  endpoint: string;
  protocol: 'syslog' | 'cef' | 'leef' | 'json' | 'splunk_hec';
  transport: 'tcp' | 'udp' | 'http' | 'https';
  port: number;
  tls: TLSConfig;
  batchSize: number;
  flushIntervalMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  compression: boolean;
  hmacKey?: string;
}

export interface TLSConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  verifyPeer: boolean;
  minVersion: 'TLSv1.2' | 'TLSv1.3';
}

export interface AuditLogEntry {
  version: string;
  id: string;
  timestamp: string;
  sequence: number;
  checksum: string;
  previousChecksum: string;
  event: SecurityEvent;
}

// ============================================================================
// SIEM CONNECTOR
// ============================================================================

export class SIEMConnector extends EventEmitter {
  private config: SIEMConfig;
  private buffer: SecurityEvent[] = [];
  private sequence: number = 0;
  private previousChecksum: string = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private connected: boolean = false;

  constructor(config: SIEMConfig) {
    super();
    this.config = config;
    this.startFlushTimer();
  }

  /**
   * Send a security event to the SIEM
   */
  async sendEvent(event: SecurityEvent): Promise<void> {
    // Enrich event with additional metadata
    const enrichedEvent = this.enrichEvent(event);

    // Add to buffer
    this.buffer.push(enrichedEvent);

    // Flush if buffer is full
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }

    this.emit('eventQueued', enrichedEvent);
  }

  /**
   * Flush buffered events to SIEM
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const auditLogs = events.map((event) => this.createAuditLogEntry(event));
      await this.sendToSIEM(auditLogs);
      this.emit('eventsFlushed', { count: events.length });
    } catch (error) {
      // Re-add events to buffer for retry
      this.buffer = [...events, ...this.buffer];
      this.emit('flushError', { error, eventCount: events.length });
      throw error;
    }
  }

  /**
   * Create tamper-evident audit log entry
   */
  private createAuditLogEntry(event: SecurityEvent): AuditLogEntry {
    this.sequence++;

    const entry: Omit<AuditLogEntry, 'checksum'> = {
      version: '1.0.0',
      id: `audit-${Date.now()}-${this.sequence}`,
      timestamp: new Date().toISOString(),
      sequence: this.sequence,
      previousChecksum: this.previousChecksum,
      event,
    };

    // Create cryptographic checksum for tamper evidence
    const checksum = this.calculateChecksum(entry);
    this.previousChecksum = checksum;

    return { ...entry, checksum };
  }

  /**
   * Calculate HMAC checksum for audit log integrity
   */
  private calculateChecksum(entry: Omit<AuditLogEntry, 'checksum'>): string {
    const data = JSON.stringify(entry);

    if (this.config.hmacKey) {
      return createHmac('sha256', this.config.hmacKey).update(data).digest('hex');
    }

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Enrich event with standard metadata
   */
  private enrichEvent(event: SecurityEvent): SecurityEvent {
    return {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
      context: {
        ...event.context,
        correlationId:
          event.context.correlationId || this.generateCorrelationId(),
      },
    };
  }

  /**
   * Send events to SIEM endpoint
   */
  private async sendToSIEM(auditLogs: AuditLogEntry[]): Promise<void> {
    const formattedLogs = auditLogs.map((log) => this.formatForSIEM(log));

    switch (this.config.transport) {
      case 'http':
      case 'https':
        await this.sendHttpBatch(formattedLogs);
        break;
      case 'tcp':
        await this.sendTcpBatch(formattedLogs);
        break;
      case 'udp':
        await this.sendUdpBatch(formattedLogs);
        break;
    }
  }

  /**
   * Format audit log for specific SIEM protocol
   */
  private formatForSIEM(log: AuditLogEntry): string {
    switch (this.config.protocol) {
      case 'cef':
        return this.formatCEF(log);
      case 'leef':
        return this.formatLEEF(log);
      case 'syslog':
        return this.formatSyslog(log);
      case 'splunk_hec':
        return this.formatSplunkHEC(log);
      case 'json':
      default:
        return JSON.stringify(log);
    }
  }

  /**
   * Format as Common Event Format (CEF)
   */
  private formatCEF(log: AuditLogEntry): string {
    const event = log.event;
    const severityMap: Record<Severity, number> = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 3,
      informational: 1,
    };

    const header = [
      'CEF:0',
      'IntelGraph',
      'ZeroTrust',
      '1.0',
      event.eventType,
      event.eventType.replace(/_/g, ' '),
      severityMap[event.severity],
    ].join('|');

    const extension = [
      `act=${event.action.type}`,
      `src=${event.context.sourceIp}`,
      `suser=${event.actor.id}`,
      `outcome=${event.outcome.result}`,
      `msg=${event.outcome.reason || ''}`,
      `cs1=${event.zeroTrust.trustScore}`,
      `cs1Label=TrustScore`,
      `cs2=${event.zeroTrust.policyDecision}`,
      `cs2Label=PolicyDecision`,
      `cn1=${log.sequence}`,
      `cn1Label=Sequence`,
      `flexString1=${log.checksum}`,
      `flexString1Label=AuditChecksum`,
    ].join(' ');

    return `${header}|${extension}`;
  }

  /**
   * Format as Log Event Extended Format (LEEF)
   */
  private formatLEEF(log: AuditLogEntry): string {
    const event = log.event;

    const header = [
      'LEEF:2.0',
      'IntelGraph',
      'ZeroTrust',
      '1.0',
      event.eventType,
    ].join('|');

    const attributes = [
      `src=${event.context.sourceIp}`,
      `usrName=${event.actor.id}`,
      `action=${event.action.type}`,
      `resource=${event.resource.id}`,
      `result=${event.outcome.result}`,
      `trustScore=${event.zeroTrust.trustScore}`,
      `policyDecision=${event.zeroTrust.policyDecision}`,
      `sequence=${log.sequence}`,
      `checksum=${log.checksum}`,
    ].join('\t');

    return `${header}\t${attributes}`;
  }

  /**
   * Format as Syslog RFC 5424
   */
  private formatSyslog(log: AuditLogEntry): string {
    const event = log.event;
    const severityMap: Record<Severity, number> = {
      critical: 2,
      high: 3,
      medium: 4,
      low: 5,
      informational: 6,
    };

    const facility = 10; // security/authorization
    const priority = facility * 8 + severityMap[event.severity];
    const timestamp = new Date(log.timestamp).toISOString();
    const hostname = event.source.hostname;
    const appName = 'intelgraph-zerotrust';
    const procId = event.source.containerId || '-';
    const msgId = event.eventType;

    const structuredData = `[zerotrust@intelgraph trustScore="${event.zeroTrust.trustScore}" policyDecision="${event.zeroTrust.policyDecision}" sequence="${log.sequence}" checksum="${log.checksum}"]`;

    const message = JSON.stringify({
      actor: event.actor.id,
      action: event.action.type,
      resource: event.resource.id,
      outcome: event.outcome.result,
      reason: event.outcome.reason,
    });

    return `<${priority}>1 ${timestamp} ${hostname} ${appName} ${procId} ${msgId} ${structuredData} ${message}`;
  }

  /**
   * Format for Splunk HTTP Event Collector
   */
  private formatSplunkHEC(log: AuditLogEntry): string {
    return JSON.stringify({
      time: log.event.timestamp / 1000,
      host: log.event.source.hostname,
      source: 'intelgraph-zerotrust',
      sourcetype: 'security:zerotrust',
      index: 'security',
      event: {
        ...log.event,
        auditSequence: log.sequence,
        auditChecksum: log.checksum,
        previousChecksum: log.previousChecksum,
      },
    });
  }

  /**
   * Send batch via HTTP/HTTPS
   */
  private async sendHttpBatch(logs: string[]): Promise<void> {
    const url = `${this.config.transport}://${this.config.endpoint}:${this.config.port}`;

    const body =
      this.config.protocol === 'splunk_hec'
        ? logs.join('\n')
        : JSON.stringify(logs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.protocol === 'splunk_hec' && {
          Authorization: `Splunk ${process.env.SPLUNK_HEC_TOKEN}`,
        }),
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`SIEM HTTP request failed: ${response.status}`);
    }
  }

  /**
   * Send batch via TCP (placeholder - would use net module)
   */
  private async sendTcpBatch(logs: string[]): Promise<void> {
    // In production, use net.Socket with TLS
    console.log(`[SIEM] Would send ${logs.length} logs via TCP`);
  }

  /**
   * Send batch via UDP (placeholder - would use dgram module)
   */
  private async sendUdpBatch(logs: string[]): Promise<void> {
    // In production, use dgram.Socket
    console.log(`[SIEM] Would send ${logs.length} logs via UDP`);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        this.emit('flushError', err);
      });
    }, this.config.flushIntervalMs);
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `cor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
    this.connected = false;
  }
}

// ============================================================================
// OPA AUDIT HANDLER
// ============================================================================

export class OPAAuditHandler {
  private siem: SIEMConnector;

  constructor(siem: SIEMConnector) {
    this.siem = siem;
  }

  /**
   * Process OPA policy decision and send to SIEM
   */
  async handlePolicyDecision(decision: OPAPolicyDecision): Promise<void> {
    const event: SecurityEvent = {
      id: decision.decision_id,
      timestamp: Date.now(),
      eventType: 'policy_decision',
      severity: decision.result.allow ? 'informational' : 'medium',
      source: {
        type: 'opa',
        component: 'policy-engine',
        hostname: process.env.HOSTNAME || 'unknown',
        podName: process.env.POD_NAME,
        namespace: process.env.POD_NAMESPACE,
      },
      actor: {
        type: decision.input.identity?.type || 'unknown',
        id: decision.input.identity?.id || 'unknown',
        spiffeId: decision.input.identity?.spiffe_id,
        roles: decision.input.identity?.roles,
        clearanceLevel: decision.input.identity?.clearance_level,
      },
      action: {
        type: decision.input.action,
        path: decision.input.resource?.path,
        method: decision.input.method,
      },
      resource: {
        type: decision.input.resource?.type || 'unknown',
        id: decision.input.resource?.id || 'unknown',
        classification: decision.input.resource?.classification,
      },
      outcome: {
        result: decision.result.allow ? 'success' : 'denied',
        reason: decision.result.reason,
        policyViolations: decision.result.violations,
      },
      context: {
        sourceIp: decision.input.context?.source_ip || 'unknown',
        requestId: decision.decision_id,
      },
      zeroTrust: {
        trustScore: decision.result.trust_score || 0,
        identityVerified: decision.result.identity_verified || false,
        deviceTrusted: decision.result.device_trusted || false,
        sessionFresh: decision.result.session_fresh || false,
        mfaVerified: decision.input.identity?.mfa_verified || false,
        policyDecision: decision.result.allow ? 'allow' : 'deny',
        enforcementPoint: 'opa-pdp',
      },
      compliance: {
        frameworks: ['NIST-800-53', 'CIS', 'FedRAMP'],
        controls: ['AC-3', 'AC-6', 'AU-2', 'AU-3'],
        retentionRequired: true,
        auditRequired: decision.result.audit_required || false,
      },
    };

    await this.siem.sendEvent(event);
  }
}

export interface OPAPolicyDecision {
  decision_id: string;
  input: {
    identity?: {
      type: string;
      id: string;
      spiffe_id?: string;
      roles?: string[];
      clearance_level?: number;
      mfa_verified?: boolean;
    };
    action: string;
    method?: string;
    resource?: {
      type: string;
      id: string;
      path?: string;
      classification?: string;
    };
    context?: {
      source_ip: string;
    };
  };
  result: {
    allow: boolean;
    reason?: string;
    violations?: string[];
    trust_score?: number;
    identity_verified?: boolean;
    device_trusted?: boolean;
    session_fresh?: boolean;
    audit_required?: boolean;
  };
}

// ============================================================================
// FALCO ALERT HANDLER
// ============================================================================

export class FalcoAlertHandler {
  private siem: SIEMConnector;

  constructor(siem: SIEMConnector) {
    this.siem = siem;
  }

  /**
   * Process Falco alert and send to SIEM
   */
  async handleFalcoAlert(alert: FalcoAlert): Promise<void> {
    const severityMap: Record<string, Severity> = {
      EMERGENCY: 'critical',
      ALERT: 'critical',
      CRITICAL: 'critical',
      ERROR: 'high',
      WARNING: 'medium',
      NOTICE: 'low',
      INFORMATIONAL: 'informational',
      DEBUG: 'informational',
    };

    const event: SecurityEvent = {
      id: `falco-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(alert.time).getTime(),
      eventType: this.mapFalcoRuleToEventType(alert.rule),
      severity: severityMap[alert.priority] || 'medium',
      source: {
        type: 'falco',
        component: 'runtime-security',
        hostname: alert.hostname || 'unknown',
        podName: alert.output_fields?.['k8s.pod.name'],
        namespace: alert.output_fields?.['k8s.ns.name'],
        containerId: alert.output_fields?.['container.id'],
      },
      actor: {
        type: 'workload',
        id:
          alert.output_fields?.['container.name'] ||
          alert.output_fields?.['proc.name'] ||
          'unknown',
      },
      action: {
        type: alert.rule,
        command: alert.output_fields?.['proc.cmdline'],
      },
      resource: {
        type: this.inferResourceType(alert),
        id: alert.output_fields?.['fd.name'] || 'unknown',
      },
      outcome: {
        result: 'failure',
        reason: alert.output,
      },
      context: {
        sourceIp: alert.output_fields?.['fd.sip'] || 'unknown',
        destinationIp: alert.output_fields?.['fd.dip'],
        sourcePort: alert.output_fields?.['fd.sport'],
        destinationPort: alert.output_fields?.['fd.dport'],
      },
      zeroTrust: {
        trustScore: 0,
        identityVerified: false,
        deviceTrusted: false,
        sessionFresh: false,
        mfaVerified: false,
        policyDecision: 'deny',
        enforcementPoint: 'falco-runtime',
      },
      compliance: {
        frameworks: ['NIST-800-53', 'CIS'],
        controls: this.mapToComplianceControls(alert.rule),
        retentionRequired: true,
        auditRequired: true,
      },
      rawData: alert.output_fields,
    };

    await this.siem.sendEvent(event);
  }

  private mapFalcoRuleToEventType(rule: string): SecurityEventType {
    const ruleMapping: Record<string, SecurityEventType> = {
      container_escape: 'container_event',
      privilege_escalation: 'privilege_escalation',
      network: 'network_access',
      file: 'file_integrity',
      process: 'container_event',
      secret: 'secret_access',
      credential: 'authentication',
    };

    for (const [key, type] of Object.entries(ruleMapping)) {
      if (rule.toLowerCase().includes(key)) {
        return type;
      }
    }

    return 'threat_detection';
  }

  private inferResourceType(alert: FalcoAlert): string {
    if (alert.output_fields?.['fd.name']) return 'file';
    if (alert.output_fields?.['fd.sip']) return 'network';
    if (alert.output_fields?.['proc.name']) return 'process';
    return 'unknown';
  }

  private mapToComplianceControls(rule: string): string[] {
    const controls: string[] = ['AU-2', 'AU-3', 'SI-4'];

    if (rule.includes('privilege')) controls.push('AC-6');
    if (rule.includes('network')) controls.push('SC-7');
    if (rule.includes('file')) controls.push('AU-9');
    if (rule.includes('container')) controls.push('CM-7');

    return controls;
  }
}

export interface FalcoAlert {
  time: string;
  rule: string;
  priority: string;
  output: string;
  hostname?: string;
  output_fields?: Record<string, unknown>;
  tags?: string[];
}

// ============================================================================
// ZERO-TRUST AUDIT LOGGER
// ============================================================================

export class ZeroTrustAuditLogger {
  private siem: SIEMConnector;
  private opaHandler: OPAAuditHandler;
  private falcoHandler: FalcoAlertHandler;

  constructor(config: SIEMConfig) {
    this.siem = new SIEMConnector(config);
    this.opaHandler = new OPAAuditHandler(this.siem);
    this.falcoHandler = new FalcoAlertHandler(this.siem);
  }

  /**
   * Log OPA policy decision
   */
  async logPolicyDecision(decision: OPAPolicyDecision): Promise<void> {
    await this.opaHandler.handlePolicyDecision(decision);
  }

  /**
   * Log Falco runtime alert
   */
  async logFalcoAlert(alert: FalcoAlert): Promise<void> {
    await this.falcoHandler.handleFalcoAlert(alert);
  }

  /**
   * Log generic security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.siem.sendEvent(event);
  }

  /**
   * Create authentication event
   */
  async logAuthentication(params: {
    actorId: string;
    success: boolean;
    method: string;
    sourceIp: string;
    mfaUsed?: boolean;
    reason?: string;
  }): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      eventType: 'authentication',
      severity: params.success ? 'informational' : 'medium',
      source: {
        type: 'application',
        component: 'auth-service',
        hostname: process.env.HOSTNAME || 'unknown',
      },
      actor: {
        type: 'user',
        id: params.actorId,
      },
      action: {
        type: 'authenticate',
        method: params.method,
      },
      resource: {
        type: 'identity',
        id: 'auth-endpoint',
      },
      outcome: {
        result: params.success ? 'success' : 'failure',
        reason: params.reason,
      },
      context: {
        sourceIp: params.sourceIp,
      },
      zeroTrust: {
        trustScore: params.success ? 0.8 : 0,
        identityVerified: params.success,
        deviceTrusted: false,
        sessionFresh: params.success,
        mfaVerified: params.mfaUsed || false,
        policyDecision: params.success ? 'allow' : 'deny',
        enforcementPoint: 'auth-service',
      },
      compliance: {
        frameworks: ['NIST-800-53'],
        controls: ['IA-2', 'IA-5', 'AU-2'],
        retentionRequired: true,
        auditRequired: true,
      },
    };

    await this.siem.sendEvent(event);
  }

  /**
   * Log data access event
   */
  async logDataAccess(params: {
    actorId: string;
    resourceId: string;
    action: 'read' | 'write' | 'delete';
    classification: string;
    allowed: boolean;
    reason?: string;
  }): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      eventType: 'data_access',
      severity:
        params.classification === 'secret' || params.classification === 'top_secret'
          ? 'high'
          : 'medium',
      source: {
        type: 'application',
        component: 'data-service',
        hostname: process.env.HOSTNAME || 'unknown',
      },
      actor: {
        type: 'user',
        id: params.actorId,
      },
      action: {
        type: params.action,
      },
      resource: {
        type: 'data',
        id: params.resourceId,
        classification: params.classification,
      },
      outcome: {
        result: params.allowed ? 'success' : 'denied',
        reason: params.reason,
      },
      context: {
        sourceIp: 'internal',
      },
      zeroTrust: {
        trustScore: params.allowed ? 0.9 : 0,
        identityVerified: true,
        deviceTrusted: true,
        sessionFresh: true,
        mfaVerified: true,
        policyDecision: params.allowed ? 'allow' : 'deny',
        enforcementPoint: 'data-service',
      },
      compliance: {
        frameworks: ['NIST-800-53', 'FedRAMP'],
        controls: ['AC-3', 'AC-6', 'AU-2', 'SC-8'],
        dataClassification: params.classification,
        retentionRequired: true,
        auditRequired: true,
      },
    };

    await this.siem.sendEvent(event);
  }

  private generateId(): string {
    return `zt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close(): Promise<void> {
    await this.siem.close();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createZeroTrustAuditLogger(
  endpoint: string = 'siem.intelgraph.local',
  port: number = 514,
): ZeroTrustAuditLogger {
  const config: SIEMConfig = {
    endpoint,
    protocol: 'syslog',
    transport: 'tcp',
    port,
    tls: {
      enabled: true,
      verifyPeer: true,
      minVersion: 'TLSv1.2',
    },
    batchSize: 100,
    flushIntervalMs: 5000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    compression: true,
    hmacKey: process.env.AUDIT_HMAC_KEY,
  };

  return new ZeroTrustAuditLogger(config);
}
