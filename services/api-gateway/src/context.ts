import type { Request } from 'express';

export interface GraphQLContext {
  authorityId?: string;
  reasonForAccess?: string;
  policyWarnings?: any[];
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
    req,
  };
}
