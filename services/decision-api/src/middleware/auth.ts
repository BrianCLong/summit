/**
 * Authentication middleware for Decision API
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthContext {
  user_id: string;
  tenant_id: string;
  role: string;
  clearance_level: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip auth for health checks
  if (request.url.startsWith('/health')) {
    return;
  }

  // In development, allow bypass with headers
  const isDev = process.env.NODE_ENV === 'development';
  const bypassAuth = process.env.AUTH_BYPASS === 'true';

  if (isDev && bypassAuth) {
    request.auth = {
      user_id: request.headers['x-user-id'] as string || 'dev-user',
      tenant_id: request.headers['x-tenant-id'] as string || 'dev-tenant',
      role: request.headers['x-user-role'] as string || 'analyst',
      clearance_level: request.headers['x-clearance-level'] as string || 'internal',
      permissions: ['entity:read', 'entity:create', 'claim:read', 'claim:create',
                    'evidence:read', 'evidence:create', 'decision:read', 'decision:create'],
    };
    return;
  }

  // Extract auth from JWT token
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // In production, validate JWT and extract claims
    // For now, decode without verification in dev
    const payload = decodeToken(token);

    if (!payload.user_id || !payload.tenant_id) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
      return;
    }

    request.auth = {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      role: payload.role || 'viewer',
      clearance_level: payload.clearance_level || 'public',
      permissions: payload.permissions || [],
    };
  } catch (error) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Token validation failed',
    });
  }
}

function decodeToken(token: string): any {
  // Simple base64 decode of JWT payload (middle part)
  // In production, use proper JWT verification
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    throw new Error('Failed to decode token');
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(auth: AuthContext, permission: string): boolean {
  return auth.permissions.includes(permission) || auth.permissions.includes('*');
}

/**
 * Check if user has required clearance level
 */
export function hasClearance(auth: AuthContext, requiredLevel: string): boolean {
  const levels = ['public', 'internal', 'confidential', 'restricted', 'classified'];
  const userLevel = levels.indexOf(auth.clearance_level);
  const required = levels.indexOf(requiredLevel);
  return userLevel >= required;
}
