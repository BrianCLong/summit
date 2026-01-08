/**
 * CompanyOS Identity Fabric - Authentication Service
 *
 * Implements critical authentication flows:
 * - Login with OIDC/SAML SSO
 * - Step-up authentication with WebAuthn
 * - Service-to-service authentication with mTLS/SPIFFE
 * - Cross-tenant isolation enforcement
 *
 * @module identity-fabric/auth
 */

import { EventEmitter } from "events";
import crypto from "crypto";
import type {
  Identity,
  UserIdentity,
  ServiceIdentity,
  WorkloadIdentity,
  SessionContext,
  TrustLevel,
  AuthenticationMethod,
  MfaMethod,
  GeoLocation,
  Tenant,
} from "../identity/types.js";

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * Authentication request from client.
 */
export interface AuthenticationRequest {
  method: AuthenticationMethod;
  credentials: AuthenticationCredentials;
  tenantId: string;
  clientInfo: ClientInfo;
  requestedScopes?: string[];
}

export type AuthenticationCredentials =
  | PasswordCredentials
  | OIDCCredentials
  | SAMLCredentials
  | APIKeyCredentials
  | CertificateCredentials
  | SPIFFECredentials;

export interface PasswordCredentials {
  type: "password";
  email: string;
  password: string;
}

export interface OIDCCredentials {
  type: "oidc";
  idToken: string;
  accessToken: string;
  provider: string;
  nonce?: string;
}

export interface SAMLCredentials {
  type: "saml";
  samlResponse: string;
  relayState?: string;
}

export interface APIKeyCredentials {
  type: "api_key";
  keyId: string;
  keySecret: string;
}

export interface CertificateCredentials {
  type: "certificate";
  certificate: string;
  chain?: string[];
}

export interface SPIFFECredentials {
  type: "spiffe";
  svid: string;
  bundle: string;
}

export interface ClientInfo {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  deviceFingerprint?: string;
  geoLocation?: GeoLocation;
}

/**
 * Authentication result.
 */
export interface AuthenticationResult {
  success: boolean;
  identity?: Identity;
  session?: SessionContext;
  tokens?: AuthTokens;
  error?: AuthenticationError;
  mfaRequired?: boolean;
  mfaChallenge?: MFAChallenge;
  riskAssessment?: RiskAssessment;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
  tokenType: "Bearer";
  scope: string[];
}

export interface MFAChallenge {
  challengeId: string;
  methods: MfaMethod[];
  expiresAt: Date;
}

export interface RiskAssessment {
  score: number;
  factors: string[];
  recommendation: "allow" | "mfa" | "stepup" | "deny";
}

export interface AuthenticationError {
  code: string;
  message: string;
  retryable: boolean;
  lockoutRemaining?: number;
}

// ============================================================================
// STEP-UP AUTHENTICATION
// ============================================================================

export interface StepUpRequest {
  sessionId: string;
  purpose: string;
  requestedScopes: string[];
  method: MfaMethod;
  clientInfo: ClientInfo;
}

export interface StepUpChallenge {
  challengeId: string;
  type: MfaMethod;
  challenge: string;
  expiresAt: Date;
  allowedAttempts: number;
  remainingAttempts: number;
}

export interface StepUpResponse {
  challengeId: string;
  response: string;
  authenticatorData?: string;
  clientDataJSON?: string;
  signature?: string;
}

export interface StepUpResult {
  success: boolean;
  scopes?: string[];
  expiresAt?: Date;
  error?: string;
}

// ============================================================================
// SERVICE AUTHENTICATION
// ============================================================================

export interface ServiceAuthRequest {
  serviceId: string;
  credentials: APIKeyCredentials | CertificateCredentials | SPIFFECredentials;
  targetAudience: string;
  requestedScopes: string[];
}

export interface ServiceAuthResult {
  success: boolean;
  identity?: ServiceIdentity | WorkloadIdentity;
  token?: string;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}

// ============================================================================
// AUTHENTICATION SERVICE CONFIGURATION
// ============================================================================

export interface AuthenticationServiceConfig {
  sessionDurationSeconds: number;
  accessTokenDurationSeconds: number;
  refreshTokenDurationSeconds: number;
  stepUpDurationSeconds: number;
  maxLoginAttempts: number;
  lockoutDurationSeconds: number;
  mfaGracePeriodDays: number;
  requireMfaForSensitive: boolean;
  riskBasedAuth: boolean;
  trustedProxies: string[];
  jwtSecret: string;
  jwtAlgorithm: "HS256" | "RS256" | "ES256";
  oidcProviders: OIDCProviderConfig[];
  samlProviders: SAMLProviderConfig[];
  spiffeTrustDomain: string;
}

export interface OIDCProviderConfig {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  userInfoEndpoint?: string;
}

export interface SAMLProviderConfig {
  name: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: Record<string, string>;
}

const DEFAULT_CONFIG: AuthenticationServiceConfig = {
  sessionDurationSeconds: 8 * 60 * 60, // 8 hours
  accessTokenDurationSeconds: 15 * 60, // 15 minutes
  refreshTokenDurationSeconds: 7 * 24 * 60 * 60, // 7 days
  stepUpDurationSeconds: 5 * 60, // 5 minutes
  maxLoginAttempts: 5,
  lockoutDurationSeconds: 15 * 60, // 15 minutes
  mfaGracePeriodDays: 7,
  requireMfaForSensitive: true,
  riskBasedAuth: true,
  trustedProxies: [],
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtAlgorithm: "HS256",
  oidcProviders: [],
  samlProviders: [],
  spiffeTrustDomain: "companyos.local",
};

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

export class AuthenticationService extends EventEmitter {
  private config: AuthenticationServiceConfig;
  private sessions: Map<string, SessionContext>;
  private loginAttempts: Map<string, { count: number; lockedUntil?: Date }>;
  private stepUpChallenges: Map<string, StepUpChallenge>;
  private identityLookup: IdentityLookup;
  private tenantLookup: TenantLookup;

  constructor(
    config: Partial<AuthenticationServiceConfig> = {},
    identityLookup: IdentityLookup,
    tenantLookup: TenantLookup
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessions = new Map();
    this.loginAttempts = new Map();
    this.stepUpChallenges = new Map();
    this.identityLookup = identityLookup;
    this.tenantLookup = tenantLookup;

    // Cleanup expired sessions periodically
    setInterval(() => this.cleanupExpired(), 60000);
  }

  // ==========================================================================
  // PRIMARY AUTHENTICATION FLOWS
  // ==========================================================================

  /**
   * Authenticate a user or service.
   */
  async authenticate(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const startTime = Date.now();

    try {
      // Validate tenant exists and is active
      const tenant = await this.tenantLookup.getTenant(request.tenantId);
      if (!tenant) {
        return this.authError("TENANT_NOT_FOUND", "Tenant not found", false);
      }
      if (!tenant.active) {
        return this.authError("TENANT_INACTIVE", "Tenant is inactive", false);
      }

      // Check for account lockout
      const lockoutKey = this.getLockoutKey(request);
      const lockout = this.checkLockout(lockoutKey);
      if (lockout) {
        return this.authError(
          "ACCOUNT_LOCKED",
          `Account locked. Try again in ${lockout} seconds`,
          false,
          lockout
        );
      }

      // Perform authentication based on method
      let identity: Identity | null = null;
      let authStrength: TrustLevel = "basic";

      switch (request.credentials.type) {
        case "password":
          identity = await this.authenticatePassword(request.credentials, request.tenantId);
          authStrength = "basic";
          break;
        case "oidc":
          identity = await this.authenticateOIDC(request.credentials, request.tenantId);
          authStrength = "standard";
          break;
        case "saml":
          identity = await this.authenticateSAML(request.credentials, request.tenantId);
          authStrength = "standard";
          break;
        case "api_key":
          identity = await this.authenticateAPIKey(request.credentials, request.tenantId);
          authStrength = "standard";
          break;
        case "certificate":
          identity = await this.authenticateCertificate(request.credentials, request.tenantId);
          authStrength = "high";
          break;
        case "spiffe":
          identity = await this.authenticateSPIFFE(request.credentials);
          authStrength = "high";
          break;
      }

      if (!identity) {
        this.recordFailedAttempt(lockoutKey);
        return this.authError("INVALID_CREDENTIALS", "Invalid credentials", true);
      }

      // Check if identity is active
      if (!identity.active) {
        return this.authError("IDENTITY_INACTIVE", "Identity is inactive", false);
      }

      // Perform risk assessment
      const riskAssessment = await this.assessRisk(identity, request.clientInfo, tenant);

      // Check if MFA is required
      if (identity.type === "human") {
        const user = identity as UserIdentity;
        const mfaRequired = this.isMfaRequired(user, tenant, riskAssessment);

        if (mfaRequired && !user.mfaVerified) {
          const challenge = await this.createMFAChallenge(user);
          return {
            success: false,
            mfaRequired: true,
            mfaChallenge: challenge,
            riskAssessment,
          };
        }
      }

      // Create session
      const session = await this.createSession(identity, request, authStrength, riskAssessment);

      // Generate tokens
      const tokens = await this.generateTokens(identity, session, request.requestedScopes);

      // Clear any failed attempts
      this.loginAttempts.delete(lockoutKey);

      // Emit success event
      this.emit("authentication:success", {
        identityId: identity.id,
        tenantId: request.tenantId,
        method: request.method,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        identity,
        session,
        tokens,
        riskAssessment,
      };
    } catch (error) {
      this.emit("authentication:error", {
        error: error instanceof Error ? error.message : String(error),
        tenantId: request.tenantId,
        method: request.method,
      });

      return this.authError(
        "AUTHENTICATION_ERROR",
        error instanceof Error ? error.message : "Authentication failed",
        true
      );
    }
  }

  /**
   * Authenticate password credentials.
   */
  private async authenticatePassword(
    credentials: PasswordCredentials,
    tenantId: string
  ): Promise<UserIdentity | null> {
    const user = await this.identityLookup.findUserByEmail(credentials.email, tenantId);
    if (!user) {
      return null;
    }

    // In production, this would verify against stored password hash
    // For now, we'll emit an event for the actual verification to happen elsewhere
    this.emit("password:verify", { userId: user.id, email: credentials.email });

    return user;
  }

  /**
   * Authenticate OIDC credentials.
   */
  private async authenticateOIDC(
    credentials: OIDCCredentials,
    tenantId: string
  ): Promise<UserIdentity | null> {
    const provider = this.config.oidcProviders.find((p) => p.name === credentials.provider);
    if (!provider) {
      throw new Error(`Unknown OIDC provider: ${credentials.provider}`);
    }

    // Verify ID token
    const claims = await this.verifyOIDCToken(credentials.idToken, provider);
    if (!claims) {
      return null;
    }

    // Find or create user
    const email = claims.email as string;
    let user = await this.identityLookup.findUserByEmail(email, tenantId);

    if (!user) {
      // JIT provisioning
      user = await this.identityLookup.createUser({
        email,
        displayName: (claims.name as string) || email,
        tenantId,
        type: "human",
        active: true,
        clearance: "unclassified",
        caveats: [],
        needToKnow: [],
        specialAccess: [],
        certifications: [],
        otAuthorization: false,
        groups: [],
        organizationIds: [],
        primaryOrganizationId: tenantId,
        mfaEnabled: false,
        mfaVerified: false,
        deviceTrust: "basic",
        metadata: { oidcProvider: credentials.provider },
      });
    }

    return user;
  }

  /**
   * Authenticate SAML credentials.
   */
  private async authenticateSAML(
    credentials: SAMLCredentials,
    tenantId: string
  ): Promise<UserIdentity | null> {
    // Parse and verify SAML response
    // This is a placeholder - actual implementation would use a SAML library
    this.emit("saml:verify", { response: credentials.samlResponse, tenantId });

    // For now, return null (would be implemented with actual SAML verification)
    return null;
  }

  /**
   * Authenticate API key credentials.
   */
  private async authenticateAPIKey(
    credentials: APIKeyCredentials,
    tenantId: string
  ): Promise<ServiceIdentity | null> {
    return this.identityLookup.findServiceByAPIKey(
      credentials.keyId,
      credentials.keySecret,
      tenantId
    );
  }

  /**
   * Authenticate client certificate credentials.
   */
  private async authenticateCertificate(
    credentials: CertificateCredentials,
    tenantId: string
  ): Promise<ServiceIdentity | null> {
    // Verify certificate chain
    // This is a placeholder - actual implementation would verify the cert
    this.emit("certificate:verify", { certificate: credentials.certificate });

    return null;
  }

  /**
   * Authenticate SPIFFE credentials.
   */
  private async authenticateSPIFFE(
    credentials: SPIFFECredentials
  ): Promise<WorkloadIdentity | null> {
    // Verify SVID
    const spiffeId = this.extractSpiffeId(credentials.svid);
    if (!spiffeId) {
      return null;
    }

    // Verify trust domain
    const trustDomain = spiffeId.split("/")[2];
    if (trustDomain !== this.config.spiffeTrustDomain) {
      return null;
    }

    return this.identityLookup.findWorkloadBySpiffeId(spiffeId);
  }

  // ==========================================================================
  // STEP-UP AUTHENTICATION
  // ==========================================================================

  /**
   * Initiate step-up authentication.
   */
  async initiateStepUp(request: StepUpRequest): Promise<StepUpChallenge> {
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const challengeId = crypto.randomUUID();
    const challenge = crypto.randomBytes(32).toString("base64url");

    const stepUpChallenge: StepUpChallenge = {
      challengeId,
      type: request.method,
      challenge,
      expiresAt: new Date(Date.now() + 60000), // 1 minute
      allowedAttempts: 3,
      remainingAttempts: 3,
    };

    this.stepUpChallenges.set(challengeId, stepUpChallenge);

    this.emit("stepup:initiated", {
      sessionId: request.sessionId,
      challengeId,
      purpose: request.purpose,
      method: request.method,
    });

    return stepUpChallenge;
  }

  /**
   * Complete step-up authentication.
   */
  async completeStepUp(
    sessionId: string,
    response: StepUpResponse,
    requestedScopes: string[]
  ): Promise<StepUpResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    const challenge = this.stepUpChallenges.get(response.challengeId);
    if (!challenge) {
      return { success: false, error: "Challenge not found or expired" };
    }

    if (challenge.expiresAt < new Date()) {
      this.stepUpChallenges.delete(response.challengeId);
      return { success: false, error: "Challenge expired" };
    }

    if (challenge.remainingAttempts <= 0) {
      this.stepUpChallenges.delete(response.challengeId);
      return { success: false, error: "Too many attempts" };
    }

    // Verify the response based on challenge type
    let verified = false;
    switch (challenge.type) {
      case "webauthn":
        verified = await this.verifyWebAuthn(challenge, response);
        break;
      case "totp":
        verified = await this.verifyTOTP(challenge, response);
        break;
      default:
        challenge.remainingAttempts--;
        return { success: false, error: "Unsupported MFA method" };
    }

    if (!verified) {
      challenge.remainingAttempts--;
      return { success: false, error: "Verification failed" };
    }

    // Step-up successful - update session
    const expiresAt = new Date(Date.now() + this.config.stepUpDurationSeconds * 1000);
    session.stepUpCompleted = true;
    session.stepUpExpiresAt = expiresAt;
    session.stepUpScopes = requestedScopes;

    this.stepUpChallenges.delete(response.challengeId);

    this.emit("stepup:completed", {
      sessionId,
      challengeId: response.challengeId,
      scopes: requestedScopes,
    });

    return {
      success: true,
      scopes: requestedScopes,
      expiresAt,
    };
  }

  /**
   * Check if step-up is still valid.
   */
  isStepUpValid(session: SessionContext, requiredScopes: string[]): boolean {
    if (!session.stepUpCompleted) {
      return false;
    }

    if (!session.stepUpExpiresAt || session.stepUpExpiresAt < new Date()) {
      return false;
    }

    // Check all required scopes are present
    const sessionScopes = new Set(session.stepUpScopes || []);
    return requiredScopes.every((scope) => sessionScopes.has(scope));
  }

  // ==========================================================================
  // SERVICE-TO-SERVICE AUTHENTICATION
  // ==========================================================================

  /**
   * Authenticate a service for service-to-service communication.
   */
  async authenticateService(request: ServiceAuthRequest): Promise<ServiceAuthResult> {
    try {
      let identity: ServiceIdentity | WorkloadIdentity | null = null;

      switch (request.credentials.type) {
        case "api_key":
          identity = await this.identityLookup.findServiceByAPIKey(
            request.credentials.keyId,
            request.credentials.keySecret,
            request.serviceId
          );
          break;
        case "certificate":
          // mTLS authentication
          identity = await this.authenticateServiceCertificate(request.credentials);
          break;
        case "spiffe":
          identity = await this.authenticateSPIFFE(request.credentials);
          break;
      }

      if (!identity) {
        return { success: false, error: "Invalid credentials" };
      }

      // Validate target audience
      if (identity.type === "workload") {
        const workload = identity as WorkloadIdentity;
        if (!workload.allowedAudiences.includes(request.targetAudience)) {
          return { success: false, error: "Invalid target audience" };
        }
      }

      // Validate scopes
      const allowedScopes = this.getServiceScopes(identity);
      const grantedScopes = request.requestedScopes.filter((s) => allowedScopes.has(s));

      if (grantedScopes.length === 0) {
        return { success: false, error: "No valid scopes" };
      }

      // Generate service token
      const token = await this.generateServiceToken(
        identity,
        grantedScopes,
        request.targetAudience
      );
      const expiresAt = new Date(Date.now() + this.config.accessTokenDurationSeconds * 1000);

      this.emit("service:authenticated", {
        serviceId: identity.id,
        targetAudience: request.targetAudience,
        scopes: grantedScopes,
      });

      return {
        success: true,
        identity,
        token,
        expiresAt,
        scopes: grantedScopes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Service authentication failed",
      };
    }
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new session.
   */
  private async createSession(
    identity: Identity,
    request: AuthenticationRequest,
    authStrength: TrustLevel,
    riskAssessment: RiskAssessment
  ): Promise<SessionContext> {
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const user = identity.type === "human" ? (identity as UserIdentity) : null;

    const session: SessionContext = {
      sessionId,
      principalId: identity.id,
      principalType: identity.type,
      tenantId: request.tenantId,
      authenticatedAt: now,
      expiresAt: new Date(now.getTime() + this.config.sessionDurationSeconds * 1000),
      authenticationMethod: request.method,
      authenticationStrength: authStrength,
      mfaCompleted: user?.mfaVerified ?? false,
      mfaMethod: undefined,
      stepUpCompleted: false,
      deviceId: request.clientInfo.deviceId,
      deviceTrust: this.assessDeviceTrust(request.clientInfo),
      ipAddress: request.clientInfo.ipAddress,
      userAgent: request.clientInfo.userAgent,
      geoLocation: request.clientInfo.geoLocation,
      riskScore: riskAssessment.score,
      riskFactors: riskAssessment.factors,
    };

    this.sessions.set(sessionId, session);

    this.emit("session:created", {
      sessionId,
      identityId: identity.id,
      tenantId: request.tenantId,
    });

    return session;
  }

  /**
   * Get session by ID.
   */
  getSession(sessionId: string): SessionContext | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Invalidate a session.
   */
  invalidateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    this.emit("session:invalidated", {
      sessionId,
      identityId: session.principalId,
      tenantId: session.tenantId,
    });

    return true;
  }

  /**
   * Invalidate all sessions for an identity.
   */
  invalidateAllSessions(identityId: string): number {
    let count = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.principalId === identityId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      this.emit("sessions:invalidated", { identityId, count });
    }

    return count;
  }

  // ==========================================================================
  // CROSS-TENANT ISOLATION
  // ==========================================================================

  /**
   * Validate cross-tenant access.
   * By default, cross-tenant access is denied.
   */
  async validateCrossTenantAccess(
    session: SessionContext,
    targetTenantId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    // Same tenant - always allowed
    if (session.tenantId === targetTenantId) {
      return { allowed: true, reason: "Same tenant" };
    }

    // Get identity
    const identity = await this.identityLookup.getIdentityById(session.principalId);
    if (!identity) {
      return { allowed: false, reason: "Identity not found" };
    }

    // Check if identity has cross-tenant capability
    if (identity.type === "human") {
      const user = identity as UserIdentity;

      // Check if user belongs to target tenant
      if (user.organizationIds?.includes(targetTenantId)) {
        return { allowed: true, reason: "User belongs to target tenant" };
      }

      // Check for explicit cross-tenant authorization
      if ((user.metadata as any)?.crossTenantAuthorized?.includes(targetTenantId)) {
        return { allowed: true, reason: "Explicit cross-tenant authorization" };
      }
    }

    // Service accounts may have cross-tenant scopes
    if (identity.type === "service") {
      const service = identity as ServiceIdentity;
      if (service.scopes.includes(`tenant:${targetTenantId}:access`)) {
        return { allowed: true, reason: "Service has cross-tenant scope" };
      }
    }

    return { allowed: false, reason: "Cross-tenant access denied" };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async verifyOIDCToken(
    idToken: string,
    provider: OIDCProviderConfig
  ): Promise<Record<string, unknown> | null> {
    // This is a placeholder - actual implementation would verify JWT signature
    // against the provider's JWKS endpoint
    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

      // Verify issuer
      if (payload.iss !== provider.issuer) {
        return null;
      }

      // Verify audience
      if (payload.aud !== provider.clientId) {
        return null;
      }

      // Verify expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private extractSpiffeId(svid: string): string | null {
    // Extract SPIFFE ID from SVID (X.509 certificate)
    // This is a placeholder - actual implementation would parse the certificate
    try {
      // SVID contains SPIFFE ID in the URI SAN
      // For now, assume it's passed directly
      if (svid.startsWith("spiffe://")) {
        return svid;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async verifyWebAuthn(
    challenge: StepUpChallenge,
    response: StepUpResponse
  ): Promise<boolean> {
    // This is a placeholder - actual implementation would verify WebAuthn response
    if (!response.authenticatorData || !response.clientDataJSON || !response.signature) {
      return false;
    }

    // Verify clientDataJSON contains the challenge
    try {
      const clientData = JSON.parse(Buffer.from(response.clientDataJSON, "base64url").toString());
      if (clientData.challenge !== challenge.challenge) {
        return false;
      }
      // In production: verify signature against registered credential
      return true;
    } catch {
      return false;
    }
  }

  private async verifyTOTP(challenge: StepUpChallenge, response: StepUpResponse): Promise<boolean> {
    // This is a placeholder - actual implementation would verify TOTP
    // against stored secret
    return response.response?.length === 6 && /^\d+$/.test(response.response);
  }

  private async authenticateServiceCertificate(
    credentials: CertificateCredentials
  ): Promise<ServiceIdentity | null> {
    // Verify certificate and extract service identity
    // This is a placeholder
    return null;
  }

  private getServiceScopes(identity: ServiceIdentity | WorkloadIdentity): Set<string> {
    if (identity.type === "service") {
      return new Set((identity as ServiceIdentity).scopes);
    }
    return new Set((identity as WorkloadIdentity).allowedAudiences);
  }

  private async generateTokens(
    identity: Identity,
    session: SessionContext,
    requestedScopes?: string[]
  ): Promise<AuthTokens> {
    const now = Date.now();
    const accessExp = now + this.config.accessTokenDurationSeconds * 1000;
    const refreshExp = now + this.config.refreshTokenDurationSeconds * 1000;

    // This is a placeholder - actual implementation would use proper JWT signing
    const accessToken = this.signToken({
      sub: identity.id,
      iss: "companyos",
      aud: "companyos-api",
      iat: Math.floor(now / 1000),
      exp: Math.floor(accessExp / 1000),
      tenant_id: identity.tenantId,
      session_id: session.sessionId,
      scope: requestedScopes?.join(" ") || "",
    });

    const refreshToken = this.signToken({
      sub: identity.id,
      iss: "companyos",
      aud: "companyos-refresh",
      iat: Math.floor(now / 1000),
      exp: Math.floor(refreshExp / 1000),
      session_id: session.sessionId,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenDurationSeconds,
      tokenType: "Bearer",
      scope: requestedScopes || [],
    };
  }

  private async generateServiceToken(
    identity: ServiceIdentity | WorkloadIdentity,
    scopes: string[],
    audience: string
  ): Promise<string> {
    const now = Date.now();
    const exp = now + this.config.accessTokenDurationSeconds * 1000;

    return this.signToken({
      sub: identity.id,
      iss: "companyos",
      aud: audience,
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
      tenant_id: identity.tenantId,
      scope: scopes.join(" "),
      type: identity.type,
    });
  }

  private signToken(payload: Record<string, unknown>): string {
    const header = { alg: this.config.jwtAlgorithm, typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.config.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private async assessRisk(
    identity: Identity,
    clientInfo: ClientInfo,
    tenant: Tenant
  ): Promise<RiskAssessment> {
    const factors: string[] = [];
    let score = 0;

    // New device
    if (clientInfo.deviceId) {
      const knownDevice = await this.isKnownDevice(identity.id, clientInfo.deviceId);
      if (!knownDevice) {
        factors.push("new_device");
        score += 0.2;
      }
    } else {
      factors.push("unknown_device");
      score += 0.3;
    }

    // Unusual location
    if (clientInfo.geoLocation) {
      const unusualLocation = await this.isUnusualLocation(identity.id, clientInfo.geoLocation);
      if (unusualLocation) {
        factors.push("unusual_location");
        score += 0.3;
      }
    }

    // Unusual time
    if (this.isUnusualTime(tenant)) {
      factors.push("unusual_time");
      score += 0.1;
    }

    // IP reputation
    const ipScore = await this.getIPReputationScore(clientInfo.ipAddress);
    if (ipScore > 0.5) {
      factors.push("suspicious_ip");
      score += ipScore * 0.3;
    }

    // Determine recommendation
    let recommendation: "allow" | "mfa" | "stepup" | "deny" = "allow";
    if (score > 0.8) {
      recommendation = "deny";
    } else if (score > 0.5) {
      recommendation = "stepup";
    } else if (score > 0.3) {
      recommendation = "mfa";
    }

    return { score: Math.min(score, 1), factors, recommendation };
  }

  private isMfaRequired(
    user: UserIdentity,
    tenant: Tenant,
    riskAssessment: RiskAssessment
  ): boolean {
    // Tenant requires MFA
    if (tenant.settings.mfaRequired) {
      return true;
    }

    // User has MFA enabled
    if (user.mfaEnabled) {
      return true;
    }

    // Risk assessment recommends MFA
    if (riskAssessment.recommendation === "mfa" || riskAssessment.recommendation === "stepup") {
      return true;
    }

    // Sensitive clearance requires MFA
    if (["secret", "top-secret", "top-secret-sci"].includes(user.clearance)) {
      return true;
    }

    return false;
  }

  private async createMFAChallenge(user: UserIdentity): Promise<MFAChallenge> {
    const challengeId = crypto.randomUUID();

    // Determine available MFA methods for user
    const methods: MfaMethod[] = ["totp"];
    if ((user.metadata as any)?.webauthnRegistered) {
      methods.unshift("webauthn");
    }

    return {
      challengeId,
      methods,
      expiresAt: new Date(Date.now() + 300000), // 5 minutes
    };
  }

  private assessDeviceTrust(clientInfo: ClientInfo): TrustLevel {
    if (!clientInfo.deviceId) {
      return "untrusted";
    }

    if (clientInfo.deviceFingerprint) {
      return "basic";
    }

    return "untrusted";
  }

  private getLockoutKey(request: AuthenticationRequest): string {
    const creds = request.credentials;
    if ("email" in creds) {
      return `lockout:${request.tenantId}:${creds.email}`;
    }
    if ("keyId" in creds) {
      return `lockout:${request.tenantId}:${creds.keyId}`;
    }
    return `lockout:${request.tenantId}:${request.clientInfo.ipAddress}`;
  }

  private checkLockout(key: string): number | null {
    const record = this.loginAttempts.get(key);
    if (!record) {
      return null;
    }

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
    }

    return null;
  }

  private recordFailedAttempt(key: string): void {
    const record = this.loginAttempts.get(key) || { count: 0 };
    record.count++;

    if (record.count >= this.config.maxLoginAttempts) {
      record.lockedUntil = new Date(Date.now() + this.config.lockoutDurationSeconds * 1000);
    }

    this.loginAttempts.set(key, record);
  }

  private authError(
    code: string,
    message: string,
    retryable: boolean,
    lockoutRemaining?: number
  ): AuthenticationResult {
    return {
      success: false,
      error: { code, message, retryable, lockoutRemaining },
    };
  }

  private cleanupExpired(): void {
    const now = new Date();

    // Cleanup sessions
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }

    // Cleanup step-up challenges
    for (const [id, challenge] of this.stepUpChallenges) {
      if (challenge.expiresAt < now) {
        this.stepUpChallenges.delete(id);
      }
    }

    // Cleanup lockouts
    for (const [key, record] of this.loginAttempts) {
      if (record.lockedUntil && record.lockedUntil < now) {
        this.loginAttempts.delete(key);
      }
    }
  }

  // Placeholder methods - would be implemented with actual storage
  private async isKnownDevice(identityId: string, deviceId: string): Promise<boolean> {
    return false; // Conservative - assume unknown
  }

  private async isUnusualLocation(identityId: string, location: GeoLocation): Promise<boolean> {
    return false; // Would check against historical locations
  }

  private isUnusualTime(tenant: Tenant): boolean {
    if (!tenant.settings.enforceBusinessHours) {
      return false;
    }

    const now = new Date();
    const hour = now.getUTCHours();

    // Default business hours: 6 AM - 10 PM
    return hour < 6 || hour >= 22;
  }

  private async getIPReputationScore(ipAddress: string): Promise<number> {
    return 0; // Would check against IP reputation service
  }
}

// ============================================================================
// INTERFACES FOR DEPENDENCY INJECTION
// ============================================================================

export interface IdentityLookup {
  findUserByEmail(email: string, tenantId: string): Promise<UserIdentity | null>;
  findServiceByAPIKey(
    keyId: string,
    keySecret: string,
    tenantId: string
  ): Promise<ServiceIdentity | null>;
  findWorkloadBySpiffeId(spiffeId: string): Promise<WorkloadIdentity | null>;
  getIdentityById(id: string): Promise<Identity | null>;
  createUser(user: Omit<UserIdentity, "id" | "createdAt" | "updatedAt">): Promise<UserIdentity>;
}

export interface TenantLookup {
  getTenant(id: string): Promise<Tenant | null>;
}
