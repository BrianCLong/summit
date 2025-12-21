export interface IdentityUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  groups: string[];
  deprovisionedAt?: string | null;
  webAuthnPublicKey?: string;
}

export interface ScimGroup {
  id: string;
  tenantId: string;
  displayName: string;
  members: string[];
}

export interface Session {
  sessionId: string;
  userId: string;
  tenantId: string;
  scopes: string[];
  expiresAt: number;
  refreshToken: string;
}

export interface StepUpChallenge {
  challenge: string;
  userId: string;
  tenantId: string;
  action: string;
  createdAt: number;
  expiresAt: number;
}

export interface OidcProfile {
  sub: string;
  email: string;
  name?: string;
  tenant?: string;
  groups?: string[];
}

export interface OidcValidationResult {
  profile: OidcProfile;
  traceId: string;
}

export interface SensitiveActionContext {
  action: string;
  resource: string;
  tenantId: string;
  userId: string;
  requiresStepUp: boolean;
}
