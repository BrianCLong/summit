import crypto from 'crypto';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';

import type { BreakGlassMetadata } from './types';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  breakGlass?: BreakGlassMetadata;
  event?: string;
  roles?: string[];
  attributes?: Record<string, unknown>;
  policyId?: string;
  policyVersion?: string;
  policyBundleHash?: string;
  evaluationMs?: number;
  location?: string | null;
  clientIp?: string | null;
  clientIpHash?: string | null;
  flagState?: Record<string, string | number | boolean | null>;
  traceId?: string;
  correlationId?: string | null;
  resourceType?: string;
  resourceTenantId?: string;
}

export interface AuditBusOptions {
  logPath?: string;
  hmacKey?: string;
  serviceName?: string;
  now?: () => number;
  region?: string | null;
  defaultPolicyId?: string;
  defaultPolicyVersion?: string;
  defaultPolicyBundleHash?: string;
}

export interface AuditRecord {
  checksum: string;
  previousChecksum: string | null;
  event: DataSpineEvent;
}

export interface DataSpineEvent {
  event_id: string;
  event_type: 'authz.decision.v1';
  event_version: 'v1';
  occurred_at: string;
  recorded_at: string;
  tenant_id: string;
  subject_id: string | null;
  source_service: string;
  trace_id: string | null;
  correlation_id: string | null;
  region: string | null;
  data: {
    resource: {
      type: string;
      id: string;
      owner_tenant_id: string | null;
    };
    action: string;
    decision: 'allow' | 'deny';
    policy_id: string;
    policy_version: string;
    policy_bundle_hash: string;
    reason: string;
    roles: string[];
    attributes: Record<string, unknown>;
    evaluation_ms: number;
    location: string | null;
    client_ip_hash: string | null;
    flag_state: Record<string, string | number | boolean | null>;
  };
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function deriveClientIpHash(entry: AuditEntry): string | null {
  if (entry.clientIpHash) {
    return entry.clientIpHash;
  }
  if (!entry.clientIp) {
    return null;
  }
  return hashIp(entry.clientIp);
}

function readPreviousChecksum(logPath: string): string | null {
  if (!existsSync(logPath)) {
    return null;
  }
  try {
    const raw = readFileSync(logPath, 'utf8').trim();
    if (!raw) return null;
    const lastLine = raw.split('\n').filter(Boolean).slice(-1)[0];
    const parsed = JSON.parse(lastLine) as Partial<AuditRecord>;
    return typeof parsed.checksum === 'string' ? parsed.checksum : null;
  } catch {
    return null;
  }
}

export class AuditBus {
  private readonly logPath: string;
  private readonly hmacKey: string;
  private readonly serviceName: string;
  private readonly now: () => number;
  private readonly region: string | null;
  private readonly defaultPolicyId: string;
  private readonly defaultPolicyVersion: string;
  private readonly defaultPolicyBundleHash: string;
  private lastChecksum: string | null;

  constructor(options: AuditBusOptions = {}) {
    this.logPath =
      options.logPath || path.join(__dirname, '..', 'audit.log');
    this.hmacKey = options.hmacKey || process.env.AUDIT_HMAC_KEY || 'dev-key';
    this.serviceName = options.serviceName || 'authz-gateway';
    this.now = options.now || Date.now;
    this.region = options.region ?? process.env.REGION ?? null;
    this.defaultPolicyId =
      options.defaultPolicyId || process.env.POLICY_ID || 'opa-policy';
    this.defaultPolicyVersion =
      options.defaultPolicyVersion || process.env.POLICY_VERSION || 'v1';
    this.defaultPolicyBundleHash =
      options.defaultPolicyBundleHash ||
      process.env.POLICY_BUNDLE_HASH ||
      'bundle:unknown';
    this.lastChecksum = readPreviousChecksum(this.logPath);
  }

  publish(entry: AuditEntry): AuditRecord {
    const occurredAt = new Date(this.now()).toISOString();
    const event: DataSpineEvent = {
      event_id: crypto.randomUUID(),
      event_type: 'authz.decision.v1',
      event_version: 'v1',
      occurred_at: occurredAt,
      recorded_at: occurredAt,
      tenant_id: entry.tenantId,
      subject_id: entry.subject || null,
      source_service: this.serviceName,
      trace_id: entry.traceId ?? null,
      correlation_id: entry.correlationId ?? null,
      region: this.region,
      data: {
        resource: {
          type: entry.resourceType || 'resource',
          id: entry.resource,
          owner_tenant_id: entry.resourceTenantId || entry.tenantId || null,
        },
        action: entry.action,
        decision: entry.allowed ? 'allow' : 'deny',
        policy_id: entry.policyId || this.defaultPolicyId,
        policy_version: entry.policyVersion || this.defaultPolicyVersion,
        policy_bundle_hash:
          entry.policyBundleHash || this.defaultPolicyBundleHash,
        reason: entry.reason,
        roles: entry.roles || [],
        attributes: entry.attributes || {},
        evaluation_ms: entry.evaluationMs ?? 0,
        location: entry.location ?? null,
        client_ip_hash: deriveClientIpHash(entry),
        flag_state: entry.flagState || {},
      },
    };

    const recordBody = {
      event,
      previousChecksum: this.lastChecksum,
      breakGlass: entry.breakGlass,
    };

    const checksum = crypto
      .createHmac('sha256', this.hmacKey)
      .update(JSON.stringify(recordBody))
      .digest('hex');

    const record: AuditRecord = {
      checksum,
      previousChecksum: this.lastChecksum,
      event,
    };

    appendFileSync(this.logPath, JSON.stringify(record) + '\n');
    this.lastChecksum = checksum;
    return record;
  }
}

const defaultBus = new AuditBus();

export function log(entry: AuditEntry) {
  return defaultBus.publish(entry);
}

export function getAuditBus() {
  return defaultBus;
}
