declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      sub?: string;
      tenantId: string;
      tenant_id?: string;
      role: string;
      email?: string;
      groups?: string[];
      attributes?: Record<string, unknown>;
    };
  }
}
