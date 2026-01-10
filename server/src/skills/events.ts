import { logger } from '../config/logger.js';
import type { SkillContext, SkillResult } from './abi.js';
import type { ControllerDecision } from './controller.js';

export type AuditEventType =
  | 'controller.decision'
  | 'skill.start'
  | 'skill.end'
  | 'skill.denied'
  | 'controller.terminated';

export interface AuditEventPayload {
  decision?: Partial<ControllerDecision>;
  terminationReason?: string;
  rationale?: string;
  status?: string;
  metrics?: SkillResult['metrics'];
}

export interface AuditEvent {
  type: AuditEventType;
  timestamp: string;
  tenantId: string;
  actorId: string;
  traceId: string;
  requestId: string;
  skillId?: string;
  payload: AuditEventPayload;
}

export interface AuditSink {
  emit(event: AuditEvent): void;
}

export class LoggingAuditSink implements AuditSink {
  emit(event: AuditEvent): void {
    logger.info(
      {
        event,
        module: 'skills-controller',
      },
      `[skills-controller] ${event.type}`,
    );
  }
}

export class InMemoryAuditSink implements AuditSink {
  public readonly events: AuditEvent[] = [];

  emit(event: AuditEvent): void {
    this.events.push(event);
  }
}

export function buildAuditEvent(
  type: AuditEventType,
  ctx: SkillContext,
  payload: AuditEventPayload,
  skillId?: string,
): AuditEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    traceId: ctx.traceId,
    requestId: ctx.requestId,
    skillId,
    payload,
  };
}
