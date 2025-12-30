import { logger } from '../config/logger.js';
import type { SkillContext } from './abi.js';

export interface ProvenanceRecord {
  skillId: string;
  actorId: string;
  tenantId: string;
  message: string;
  traceId: string;
  requestId: string;
  createdAt: string;
}

export function recordSkillProvenance(record: ProvenanceRecord): void {
  logger.info(
    {
      ...record,
      module: 'skills-provenance',
    },
    '[skills] provenance recorded',
  );
}

export function buildProvenanceRecord(
  skillId: string,
  ctx: SkillContext,
  message: string,
): ProvenanceRecord {
  return {
    skillId,
    actorId: ctx.actorId,
    tenantId: ctx.tenantId,
    message,
    traceId: ctx.traceId,
    requestId: ctx.requestId,
    createdAt: new Date().toISOString(),
  };
}
