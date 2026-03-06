/**
 * Shared types for route handlers
 */

import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { TenantContext } from '../tenancy/types.js';

/**
 * Authenticated request with user context
 */
export interface AuthenticatedRequest<P = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    sub?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    tenantId?: string;
    [key: string]: any;
  };
  tenant?: TenantContext | {
    id: string;
    tenantId?: string;
    [key: string]: any;
  };
  orchestrator?: any; // AICopilotOrchestrator or other service orchestrators
}

/**
 * Request with tenant context
 */
export interface TenantRequest<P = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  tenant?: TenantContext | {
    id: string;
    tenantId?: string;
    [key: string]: any;
  };
}

/**
 * Fully authenticated and tenant-aware request
 */
export interface AuthenticatedTenantRequest extends AuthenticatedRequest {
  tenant: TenantContext;
}
