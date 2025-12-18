/**
 * Audit logging middleware for Decision API
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../index.js';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_type: 'user' | 'system' | 'ai';
  tenant_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string;
  metadata: Record<string, unknown>;
}

// Audit event types
const AUDIT_ACTIONS: Record<string, string> = {
  'POST:/api/v1/entities': 'entity:create',
  'GET:/api/v1/entities': 'entity:list',
  'GET:/api/v1/entities/:id': 'entity:read',
  'PUT:/api/v1/entities/:id': 'entity:update',
  'DELETE:/api/v1/entities/:id': 'entity:delete',
  'POST:/api/v1/claims': 'claim:create',
  'GET:/api/v1/claims': 'claim:list',
  'GET:/api/v1/claims/:id': 'claim:read',
  'PUT:/api/v1/claims/:id': 'claim:update',
  'POST:/api/v1/evidence': 'evidence:create',
  'GET:/api/v1/evidence': 'evidence:list',
  'GET:/api/v1/evidence/:id': 'evidence:read',
  'POST:/api/v1/decisions': 'decision:create',
  'GET:/api/v1/decisions': 'decision:list',
  'GET:/api/v1/decisions/:id': 'decision:read',
  'PUT:/api/v1/decisions/:id': 'decision:update',
  'POST:/api/v1/decisions/:id/approve': 'decision:approve',
  'POST:/api/v1/decisions/:id/reject': 'decision:reject',
  'GET:/api/v1/decisions/:id/graph': 'decision:graph:read',
  'GET:/api/v1/disclosure/:id': 'disclosure:generate',
};

export async function auditMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip auditing for health checks
  if (request.url.startsWith('/health')) {
    return;
  }

  try {
    const startTime = request.startTime || Date.now();
    const duration = Date.now() - startTime;

    // Determine action from method and path
    const routeKey = `${request.method}:${request.routeOptions?.url || request.url}`;
    const action = AUDIT_ACTIONS[routeKey] || `${request.method.toLowerCase()}:unknown`;

    // Extract resource type and ID from path
    const pathParts = request.url.split('/').filter(Boolean);
    const resourceType = pathParts[2] || 'unknown'; // e.g., 'entities', 'claims'
    const resourceId = extractResourceId(request);

    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor_id: request.auth?.user_id || 'anonymous',
      actor_type: 'user',
      tenant_id: request.auth?.tenant_id || 'unknown',
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      method: request.method,
      path: request.url,
      status_code: reply.statusCode,
      duration_ms: duration,
      ip_address: request.ip || null,
      user_agent: request.headers['user-agent'] || null,
      request_id: request.id,
      metadata: {
        role: request.auth?.role,
        clearance: request.auth?.clearance_level,
      },
    };

    // Write to audit log (async, don't block response)
    writeAuditLog(auditEntry).catch((err) => {
      request.log.error({ err, audit: auditEntry }, 'Failed to write audit log');
    });
  } catch (error) {
    request.log.error({ error }, 'Audit middleware error');
  }
}

function extractResourceId(request: FastifyRequest): string | null {
  const params = request.params as Record<string, string>;
  return params.id || params.decisionId || params.claimId || params.entityId || null;
}

async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const query = `
    INSERT INTO audit_log (
      id, timestamp, actor_id, actor_type, tenant_id, action,
      resource_type, resource_id, method, path, status_code,
      duration_ms, ip_address, user_agent, request_id, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
  `;

  await pool.query(query, [
    entry.id,
    entry.timestamp,
    entry.actor_id,
    entry.actor_type,
    entry.tenant_id,
    entry.action,
    entry.resource_type,
    entry.resource_id,
    entry.method,
    entry.path,
    entry.status_code,
    entry.duration_ms,
    entry.ip_address,
    entry.user_agent,
    entry.request_id,
    JSON.stringify(entry.metadata),
  ]);
}
