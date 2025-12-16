import { pg } from '../../db/pg';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../errors/ErrorHandlingFramework';
import { CreateSessionInput, MemorySession } from '../types';

const DEFAULT_STATUS: MemorySession['status'] = 'active';

export async function createSession(
  input: CreateSessionInput,
): Promise<MemorySession> {
  if (!input.tenantId) {
    throw new ValidationError('tenantId is required to create a session');
  }

  const classification = input.classification ?? [];
  const policyTags = input.policyTags ?? [];
  const metadata = input.metadata ?? {};
  const status = input.status ?? DEFAULT_STATUS;

  const result = await pg.write(
    `INSERT INTO memory_sessions (
      tenant_id, project_id, environment, classification, policy_tags, title, description,
      created_by, agent_id, status, origin_run_id, metadata
    ) VALUES (
      $1, $2, $3, $4::text[], $5::text[], $6, $7, $8, $9, $10, $11, $12::jsonb
    ) RETURNING *`,
    [
      input.tenantId,
      input.projectId ?? null,
      input.environment ?? null,
      classification,
      policyTags,
      input.title ?? null,
      input.description ?? null,
      input.createdBy ?? null,
      input.agentId ?? null,
      status,
      input.originRunId ?? null,
      metadata,
    ],
    { tenantId: input.tenantId },
  );

  return result as MemorySession;
}

export async function getSessionById(
  sessionId: string,
  tenantId: string,
): Promise<MemorySession> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to fetch a session');
  }
  const session = await pg.oneOrNone(
    `SELECT * FROM memory_sessions WHERE id = $1 AND tenant_id = $2`,
    [sessionId, tenantId],
    { tenantId },
  );

  if (!session) {
    throw new NotFoundError('memory_session', sessionId, {
      tenantId,
      component: 'memory',
    });
  }

  return session as MemorySession;
}

export async function listSessionsForTenant(
  tenantId: string,
  options: { limit?: number; projectId?: string; status?: MemorySession['status'] } = {},
): Promise<MemorySession[]> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to list sessions');
  }

  const clauses = ['tenant_id = $1'];
  const params: (string | number | MemorySession['status'])[] = [tenantId];
  let idx = params.length + 1;

  if (options.projectId) {
    clauses.push(`project_id = $${idx++}`);
    params.push(options.projectId);
  }

  if (options.status) {
    clauses.push(`status = $${idx++}`);
    params.push(options.status);
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const query = `SELECT * FROM memory_sessions WHERE ${clauses.join(
    ' AND ',
  )} ORDER BY created_at DESC LIMIT ${limit}`;

  const rows = await pg.readMany(query, params, { tenantId });
  return rows as MemorySession[];
}

export async function archiveSession(
  sessionId: string,
  tenantId: string,
): Promise<MemorySession> {
  if (!tenantId) {
    throw new ValidationError('tenantId is required to archive a session');
  }

  const updated = await pg.write(
    `UPDATE memory_sessions
     SET status = 'archived', updated_at = now()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [sessionId, tenantId],
    { tenantId },
  );

  if (!updated) {
    throw new NotFoundError('memory_session', sessionId, {
      tenantId,
      component: 'memory',
    });
  }

  return updated as MemorySession;
}

export function assertSameTenant(tenantId?: string, expectedTenantId?: string) {
  if (!tenantId || !expectedTenantId) {
    throw new ValidationError('tenantId must be provided for tenant validation');
  }
  if (tenantId !== expectedTenantId) {
    throw new AuthorizationError('Cross-tenant access is not permitted', undefined, {
      tenantId,
      metadata: { expectedTenantId },
    });
  }
}
