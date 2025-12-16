import { pg } from '../../db/pg';
import {
  NotFoundError,
  ValidationError,
} from '../../errors/ErrorHandlingFramework';
import { CreateEventInput, MemoryEvent } from '../types';
import { assertSameTenant, getSessionById } from './sessionRepository';
import { getPageById } from './pageRepository';

export async function createEvent(input: CreateEventInput): Promise<MemoryEvent> {
  if (!input.tenantId) {
    throw new ValidationError('tenantId is required to create an event');
  }

  const session = await getSessionById(input.sessionId, input.tenantId);
  const page = await getPageById(input.pageId, input.tenantId);
  assertSameTenant(input.tenantId, session.tenant_id);
  assertSameTenant(input.tenantId, page.tenant_id);

  const tags = input.tags ?? [];
  const classification = input.classification ?? [];
  const policyTags = input.policyTags ?? [];
  const metadata = input.metadata ?? {};

  const result = await pg.write(
    `INSERT INTO memory_events (
      page_id, session_id, tenant_id, sequence, type, actor_id, actor_type, content,
      tags, classification, policy_tags, origin_run_id, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::text[], $10::text[], $11::text[], $12, $13::jsonb
    ) RETURNING *`,
    [
      input.pageId,
      input.sessionId,
      input.tenantId,
      input.sequence,
      input.type,
      input.actorId ?? null,
      input.actorType ?? null,
      input.content ?? null,
      tags,
      classification,
      policyTags,
      input.originRunId ?? null,
      metadata,
    ],
    { tenantId: input.tenantId },
  );

  return result as MemoryEvent;
}

export async function listEventsForPage(
  pageId: string,
  tenantId: string,
  options: { limit?: number } = {},
): Promise<MemoryEvent[]> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to list events');
  }

  const page = await getPageById(pageId, tenantId);
  assertSameTenant(tenantId, page.tenant_id);

  const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000);
  const rows = await pg.readMany(
    `SELECT * FROM memory_events WHERE page_id = $1 AND tenant_id = $2
     ORDER BY sequence ASC
     LIMIT ${limit}`,
    [pageId, tenantId],
    { tenantId },
  );

  return rows as MemoryEvent[];
}

export async function getEventById(
  eventId: string,
  tenantId: string,
): Promise<MemoryEvent> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to fetch an event');
  }

  const row = await pg.oneOrNone(
    `SELECT * FROM memory_events WHERE id = $1 AND tenant_id = $2`,
    [eventId, tenantId],
    { tenantId },
  );

  if (!row) {
    throw new NotFoundError('memory_event', eventId, {
      tenantId,
      component: 'memory',
    });
  }

  return row as MemoryEvent;
}
