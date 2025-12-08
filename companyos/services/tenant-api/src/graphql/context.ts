/**
 * CompanyOS Tenant API - GraphQL Context
 */

import type { Request, Response } from 'express';
import type { Logger } from 'pino';

export interface AuthUser {
  id: string;
  email: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

export interface GraphQLContext {
  req: Request;
  res: Response;
  user?: AuthUser;
  requestId: string;
  logger: Logger;
  clientIp: string;
}

export function generateRequestId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}
