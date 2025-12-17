import { pg } from '../../db/pg';
import {
  NotFoundError,
  ValidationError,
} from '../../errors/ErrorHandlingFramework';
import { CreatePageInput, MemoryPage } from '../types';
import { assertSameTenant, getSessionById } from './sessionRepository';

export function toPgVector(value?: number[] | null): string | null {
  if (!value || value.length === 0) return null;
  return `[${value.join(',')}]`;
}

export async function createPage(input: CreatePageInput): Promise<MemoryPage> {
  if (!input.tenantId) {
    throw new ValidationError('tenantId is required to create a page');
  }

  const session = await getSessionById(input.sessionId, input.tenantId);
  assertSameTenant(input.tenantId, session.tenant_id);

  const tags = input.tags ?? [];
  const classification = input.classification ?? [];
  const policyTags = input.policyTags ?? [];
  const metadata = input.metadata ?? {};

  const embedding = toPgVector(input.embedding);

  const result = await pg.write(
    `INSERT INTO memory_pages (
      session_id, tenant_id, sequence, title, raw_content, memo, token_count,
      actor_id, actor_type, source, tags, classification, policy_tags, origin_run_id,
      embedding, metadata
    ) VALUES (
      $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11::text[], $12::text[],
      $13::text[], $14, CASE WHEN $15 IS NULL THEN NULL ELSE $15::vector END, $16::jsonb
    ) RETURNING *`,
    [
      input.sessionId,
      input.tenantId,
      input.sequence,
      input.title ?? null,
      input.rawContent,
      input.memo ?? null,
      input.tokenCount ?? null,
      input.actorId ?? null,
      input.actorType ?? null,
      input.source ?? null,
      tags,
      classification,
      policyTags,
      input.originRunId ?? null,
      embedding,
      metadata,
    ],
    { tenantId: input.tenantId },
  );

  return result as MemoryPage;
}

export async function listPagesForSession(
  sessionId: string,
  tenantId: string,
  options: { limit?: number } = {},
): Promise<MemoryPage[]> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to list pages');
  }

  const session = await getSessionById(sessionId, tenantId);
  assertSameTenant(tenantId, session.tenant_id);

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
  const rows = await pg.readMany(
    `SELECT * FROM memory_pages WHERE session_id = $1 AND tenant_id = $2
     ORDER BY sequence ASC
     LIMIT ${limit}`,
    [sessionId, tenantId],
    { tenantId },
  );

  return rows as MemoryPage[];
}

export async function getPageById(
  pageId: string,
  tenantId: string,
): Promise<MemoryPage> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to fetch a page');
  }

  const row = await pg.oneOrNone(
    `SELECT * FROM memory_pages WHERE id = $1 AND tenant_id = $2`,
    [pageId, tenantId],
    { tenantId },
  );

  if (!row) {
    throw new NotFoundError('memory_page', pageId, {
      tenantId,
      component: 'memory',
    });
  }

  return row as MemoryPage;
}
