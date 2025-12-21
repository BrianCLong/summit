import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface PolicyAuditEvent {
  taskId?: string | number;
  action: string;
  repo: string;
  allowed: boolean;
  reason: string;
  policyVersion: string;
  actor?: string;
  environment?: string;
  latencyMs?: number;
  timestamp: string;
  reasonForAccess?: string;
}

const AUDIT_PATH =
  process.env.MAESTRO_POLICY_AUDIT_PATH ||
  path.resolve(process.cwd(), '.maestro/policy-audit.log');

function ensureAuditDirectory(): void {
  const dir = path.dirname(AUDIT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function recordPolicyAudit(event: PolicyAuditEvent): void {
  try {
    ensureAuditDirectory();
    fs.appendFileSync(AUDIT_PATH, `${JSON.stringify(event)}\n`);
    logger.info('Policy audit event recorded', {
      taskId: event.taskId,
      action: event.action,
      allowed: event.allowed,
      policyVersion: event.policyVersion,
    });
  } catch (error: any) {
    logger.error('Failed to record policy audit event', {
      error: error?.message,
    });
  }
}

export function getAuditPath(): string {
  ensureAuditDirectory();
  return AUDIT_PATH;
}
