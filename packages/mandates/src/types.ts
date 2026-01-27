export type ScopeType = 'intent' | 'data' | 'action';

export interface Scope {
  type: ScopeType;
  value: string; // e.g., "refund:create", "tenant:123"
}

export interface Limits {
  maxSpend?: number;
  rateLimit?: number; // requests per minute
  allowedActions?: string[]; // e.g., ["read", "create"]
}

export interface Mandate {
  id: string;
  issuedAt: Date;
  expiresAt: Date;
  scopes: Scope[];
  limits: Limits;
  issuer: string; // User ID or Policy Engine ID
  description: string;
}

export interface MandateVerificationResult {
  valid: boolean;
  reason?: string;
  mandate?: Mandate;
}
