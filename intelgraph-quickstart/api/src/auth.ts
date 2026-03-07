import jwt from "jsonwebtoken";
export type AuthContext = { tenantId: string };
export function getContextFromReq(req: any): AuthContext {
  const tenantId = (req.headers["x-tenant"] as string) || process.env.TENANT_ID || "demo-tenant";
  // NOTE: extend with OIDC validation if Authorization: Bearer is present
  return { tenantId };
}
