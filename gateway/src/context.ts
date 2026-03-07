import type { ExpressContextFunctionArgument } from "@apollo/server/express4";

export interface RequestContext {
  tenantId: string;
  caseId?: string;
  userId: string;
  legalBasis?: string;
  reason?: string;
  obligations: unknown[];
  traceId?: string; // Add traceId
  spanId?: string; // Add spanId
}

export async function buildContext({
  req,
}: ExpressContextFunctionArgument): Promise<RequestContext> {
  const headers = req.headers as Record<string, string | undefined>;
  const expressReq = req as any; // Cast to any to access custom properties

  return {
    tenantId: headers["x-tenant-id"] ?? "",
    caseId: headers["x-case-id"],
    userId: headers["x-user-id"] ?? "",
    legalBasis: headers["x-legal-basis"],
    reason: headers["x-reason"],
    obligations: [],
    traceId: expressReq.context?.traceId, // Get from req.context
    spanId: expressReq.context?.spanId, // Get from req.context
  };
}
