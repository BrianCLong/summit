import type { Request } from 'express';

export interface GraphQLContext {
  authorityId?: string;
  reasonForAccess?: string;
  policyWarnings?: any[];
  token?: string;
  tenantId?: string;
  req: Request;
}

export async function createContext({
  req,
}: {
  req: Request;
}): Promise<GraphQLContext> {
  return {
    authorityId: (req as any).authorityId,
    reasonForAccess: (req as any).reasonForAccess,
    policyWarnings: (req as any).__policyWarnings || [],
    token: req.headers.authorization,
    tenantId: req.headers['x-tenant-id'] as string,
    req,
  };
}
