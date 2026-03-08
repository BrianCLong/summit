"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
const DEFAULT_CONFIG = {
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
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtAlgorithm: 'HS256',
    oidcProviders: [],
    samlProviders: [],
    spiffeTrustDomain: 'companyos.local',
};
// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================
class AuthenticationService extends events_1.EventEmitter {
    config;
    sessions;
    loginAttempts;
    stepUpChallenges;
    identityLookup;
    tenantLookup;
    constructor(config = {}, identityLookup, tenantLookup) {
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
    async authenticate(request) {
        const startTime = Date.now();
        try {
            // Validate tenant exists and is active
            const tenant = await this.tenantLookup.getTenant(request.tenantId);
            if (!tenant) {
                return this.authError('TENANT_NOT_FOUND', 'Tenant not found', false);
            }
            if (!tenant.active) {
                return this.authError('TENANT_INACTIVE', 'Tenant is inactive', false);
            }
            // Check for account lockout
            const lockoutKey = this.getLockoutKey(request);
            const lockout = this.checkLockout(lockoutKey);
            if (lockout) {
                return this.authError('ACCOUNT_LOCKED', `Account locked. Try again in ${lockout} seconds`, false, lockout);
            }
            // Perform authentication based on method
            let identity = null;
            let authStrength = 'basic';
            switch (request.credentials.type) {
                case 'password':
                    identity = await this.authenticatePassword(request.credentials, request.tenantId);
                    authStrength = 'basic';
                    break;
                case 'oidc':
                    identity = await this.authenticateOIDC(request.credentials, request.tenantId);
                    authStrength = 'standard';
                    break;
                case 'saml':
                    identity = await this.authenticateSAML(request.credentials, request.tenantId);
                    authStrength = 'standard';
                    break;
                case 'api_key':
                    identity = await this.authenticateAPIKey(request.credentials, request.tenantId);
                    authStrength = 'standard';
                    break;
                case 'certificate':
                    identity = await this.authenticateCertificate(request.credentials, request.tenantId);
                    authStrength = 'high';
                    break;
                case 'spiffe':
                    identity = await this.authenticateSPIFFE(request.credentials);
                    authStrength = 'high';
                    break;
            }
            if (!identity) {
                this.recordFailedAttempt(lockoutKey);
                return this.authError('INVALID_CREDENTIALS', 'Invalid credentials', true);
            }
            // Check if identity is active
            if (!identity.active) {
                return this.authError('IDENTITY_INACTIVE', 'Identity is inactive', false);
            }
            // Perform risk assessment
            const riskAssessment = await this.assessRisk(identity, request.clientInfo, tenant);
            // Check if MFA is required
            if (identity.type === 'human') {
                const user = identity;
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
            this.emit('authentication:success', {
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
        }
        catch (error) {
            this.emit('authentication:error', {
                error: error instanceof Error ? error.message : String(error),
                tenantId: request.tenantId,
                method: request.method,
            });
            return this.authError('AUTHENTICATION_ERROR', error instanceof Error ? error.message : 'Authentication failed', true);
        }
    }
    /**
     * Authenticate password credentials.
     */
    async authenticatePassword(credentials, tenantId) {
        const user = await this.identityLookup.findUserByEmail(credentials.email, tenantId);
        if (!user) {
            return null;
        }
        // In production, this would verify against stored password hash
        // For now, we'll emit an event for the actual verification to happen elsewhere
        this.emit('password:verify', { userId: user.id, email: credentials.email });
        return user;
    }
    /**
     * Authenticate OIDC credentials.
     */
    async authenticateOIDC(credentials, tenantId) {
        const provider = this.config.oidcProviders.find(p => p.name === credentials.provider);
        if (!provider) {
            throw new Error(`Unknown OIDC provider: ${credentials.provider}`);
        }
        // Verify ID token
        const claims = await this.verifyOIDCToken(credentials.idToken, provider);
        if (!claims) {
            return null;
        }
        // Find or create user
        const email = claims.email;
        let user = await this.identityLookup.findUserByEmail(email, tenantId);
        if (!user) {
            // JIT provisioning
            user = await this.identityLookup.createUser({
                email,
                displayName: claims.name || email,
                tenantId,
                type: 'human',
                active: true,
                clearance: 'unclassified',
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
                deviceTrust: 'basic',
                metadata: { oidcProvider: credentials.provider },
            });
        }
        return user;
    }
    /**
     * Authenticate SAML credentials.
     */
    async authenticateSAML(credentials, tenantId) {
        // Parse and verify SAML response
        // This is a placeholder - actual implementation would use a SAML library
        this.emit('saml:verify', { response: credentials.samlResponse, tenantId });
        // For now, return null (would be implemented with actual SAML verification)
        return null;
    }
    /**
     * Authenticate API key credentials.
     */
    async authenticateAPIKey(credentials, tenantId) {
        return this.identityLookup.findServiceByAPIKey(credentials.keyId, credentials.keySecret, tenantId);
    }
    /**
     * Authenticate client certificate credentials.
     */
    async authenticateCertificate(credentials, tenantId) {
        // Verify certificate chain
        // This is a placeholder - actual implementation would verify the cert
        this.emit('certificate:verify', { certificate: credentials.certificate });
        return null;
    }
    /**
     * Authenticate SPIFFE credentials.
     */
    async authenticateSPIFFE(credentials) {
        // Verify SVID
        const spiffeId = this.extractSpiffeId(credentials.svid);
        if (!spiffeId) {
            return null;
        }
        // Verify trust domain
        const trustDomain = spiffeId.split('/')[2];
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
    async initiateStepUp(request) {
        const session = this.sessions.get(request.sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const challengeId = crypto_1.default.randomUUID();
        const challenge = crypto_1.default.randomBytes(32).toString('base64url');
        const stepUpChallenge = {
            challengeId,
            type: request.method,
            challenge,
            expiresAt: new Date(Date.now() + 60000), // 1 minute
            allowedAttempts: 3,
            remainingAttempts: 3,
        };
        this.stepUpChallenges.set(challengeId, stepUpChallenge);
        this.emit('stepup:initiated', {
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
    async completeStepUp(sessionId, response, requestedScopes) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }
        const challenge = this.stepUpChallenges.get(response.challengeId);
        if (!challenge) {
            return { success: false, error: 'Challenge not found or expired' };
        }
        if (challenge.expiresAt < new Date()) {
            this.stepUpChallenges.delete(response.challengeId);
            return { success: false, error: 'Challenge expired' };
        }
        if (challenge.remainingAttempts <= 0) {
            this.stepUpChallenges.delete(response.challengeId);
            return { success: false, error: 'Too many attempts' };
        }
        // Verify the response based on challenge type
        let verified = false;
        switch (challenge.type) {
            case 'webauthn':
                verified = await this.verifyWebAuthn(challenge, response);
                break;
            case 'totp':
                verified = await this.verifyTOTP(challenge, response);
                break;
            default:
                challenge.remainingAttempts--;
                return { success: false, error: 'Unsupported MFA method' };
        }
        if (!verified) {
            challenge.remainingAttempts--;
            return { success: false, error: 'Verification failed' };
        }
        // Step-up successful - update session
        const expiresAt = new Date(Date.now() + this.config.stepUpDurationSeconds * 1000);
        session.stepUpCompleted = true;
        session.stepUpExpiresAt = expiresAt;
        session.stepUpScopes = requestedScopes;
        this.stepUpChallenges.delete(response.challengeId);
        this.emit('stepup:completed', {
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
    isStepUpValid(session, requiredScopes) {
        if (!session.stepUpCompleted) {
            return false;
        }
        if (!session.stepUpExpiresAt || session.stepUpExpiresAt < new Date()) {
            return false;
        }
        // Check all required scopes are present
        const sessionScopes = new Set(session.stepUpScopes || []);
        return requiredScopes.every(scope => sessionScopes.has(scope));
    }
    // ==========================================================================
    // SERVICE-TO-SERVICE AUTHENTICATION
    // ==========================================================================
    /**
     * Authenticate a service for service-to-service communication.
     */
    async authenticateService(request) {
        try {
            let identity = null;
            switch (request.credentials.type) {
                case 'api_key':
                    identity = await this.identityLookup.findServiceByAPIKey(request.credentials.keyId, request.credentials.keySecret, request.serviceId);
                    break;
                case 'certificate':
                    // mTLS authentication
                    identity = await this.authenticateServiceCertificate(request.credentials);
                    break;
                case 'spiffe':
                    identity = await this.authenticateSPIFFE(request.credentials);
                    break;
            }
            if (!identity) {
                return { success: false, error: 'Invalid credentials' };
            }
            // Validate target audience
            if (identity.type === 'workload') {
                const workload = identity;
                if (!workload.allowedAudiences.includes(request.targetAudience)) {
                    return { success: false, error: 'Invalid target audience' };
                }
            }
            // Validate scopes
            const allowedScopes = this.getServiceScopes(identity);
            const grantedScopes = request.requestedScopes.filter(s => allowedScopes.has(s));
            if (grantedScopes.length === 0) {
                return { success: false, error: 'No valid scopes' };
            }
            // Generate service token
            const token = await this.generateServiceToken(identity, grantedScopes, request.targetAudience);
            const expiresAt = new Date(Date.now() + this.config.accessTokenDurationSeconds * 1000);
            this.emit('service:authenticated', {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Service authentication failed',
            };
        }
    }
    // ==========================================================================
    // SESSION MANAGEMENT
    // ==========================================================================
    /**
     * Create a new session.
     */
    async createSession(identity, request, authStrength, riskAssessment) {
        const sessionId = crypto_1.default.randomUUID();
        const now = new Date();
        const user = identity.type === 'human' ? identity : null;
        const session = {
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
        this.emit('session:created', {
            sessionId,
            identityId: identity.id,
            tenantId: request.tenantId,
        });
        return session;
    }
    /**
     * Get session by ID.
     */
    getSession(sessionId) {
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
    invalidateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        this.sessions.delete(sessionId);
        this.emit('session:invalidated', {
            sessionId,
            identityId: session.principalId,
            tenantId: session.tenantId,
        });
        return true;
    }
    /**
     * Invalidate all sessions for an identity.
     */
    invalidateAllSessions(identityId) {
        let count = 0;
        for (const [sessionId, session] of this.sessions) {
            if (session.principalId === identityId) {
                this.sessions.delete(sessionId);
                count++;
            }
        }
        if (count > 0) {
            this.emit('sessions:invalidated', { identityId, count });
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
    async validateCrossTenantAccess(session, targetTenantId) {
        // Same tenant - always allowed
        if (session.tenantId === targetTenantId) {
            return { allowed: true, reason: 'Same tenant' };
        }
        // Get identity
        const identity = await this.identityLookup.getIdentityById(session.principalId);
        if (!identity) {
            return { allowed: false, reason: 'Identity not found' };
        }
        // Check if identity has cross-tenant capability
        if (identity.type === 'human') {
            const user = identity;
            // Check if user belongs to target tenant
            if (user.organizationIds?.includes(targetTenantId)) {
                return { allowed: true, reason: 'User belongs to target tenant' };
            }
            // Check for explicit cross-tenant authorization
            if (user.metadata?.crossTenantAuthorized?.includes(targetTenantId)) {
                return { allowed: true, reason: 'Explicit cross-tenant authorization' };
            }
        }
        // Service accounts may have cross-tenant scopes
        if (identity.type === 'service') {
            const service = identity;
            if (service.scopes.includes(`tenant:${targetTenantId}:access`)) {
                return { allowed: true, reason: 'Service has cross-tenant scope' };
            }
        }
        return { allowed: false, reason: 'Cross-tenant access denied' };
    }
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    async verifyOIDCToken(idToken, provider) {
        // This is a placeholder - actual implementation would verify JWT signature
        // against the provider's JWKS endpoint
        try {
            const parts = idToken.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
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
        }
        catch {
            return null;
        }
    }
    extractSpiffeId(svid) {
        // Extract SPIFFE ID from SVID (X.509 certificate)
        // This is a placeholder - actual implementation would parse the certificate
        try {
            // SVID contains SPIFFE ID in the URI SAN
            // For now, assume it's passed directly
            if (svid.startsWith('spiffe://')) {
                return svid;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async verifyWebAuthn(challenge, response) {
        // This is a placeholder - actual implementation would verify WebAuthn response
        if (!response.authenticatorData || !response.clientDataJSON || !response.signature) {
            return false;
        }
        // Verify clientDataJSON contains the challenge
        try {
            const clientData = JSON.parse(Buffer.from(response.clientDataJSON, 'base64url').toString());
            if (clientData.challenge !== challenge.challenge) {
                return false;
            }
            // In production: verify signature against registered credential
            return true;
        }
        catch {
            return false;
        }
    }
    async verifyTOTP(challenge, response) {
        // This is a placeholder - actual implementation would verify TOTP
        // against stored secret
        return response.response?.length === 6 && /^\d+$/.test(response.response);
    }
    async authenticateServiceCertificate(credentials) {
        // Verify certificate and extract service identity
        // This is a placeholder
        return null;
    }
    getServiceScopes(identity) {
        if (identity.type === 'service') {
            return new Set(identity.scopes);
        }
        return new Set(identity.allowedAudiences);
    }
    async generateTokens(identity, session, requestedScopes) {
        const now = Date.now();
        const accessExp = now + this.config.accessTokenDurationSeconds * 1000;
        const refreshExp = now + this.config.refreshTokenDurationSeconds * 1000;
        // This is a placeholder - actual implementation would use proper JWT signing
        const accessToken = this.signToken({
            sub: identity.id,
            iss: 'companyos',
            aud: 'companyos-api',
            iat: Math.floor(now / 1000),
            exp: Math.floor(accessExp / 1000),
            tenant_id: identity.tenantId,
            session_id: session.sessionId,
            scope: requestedScopes?.join(' ') || '',
        });
        const refreshToken = this.signToken({
            sub: identity.id,
            iss: 'companyos',
            aud: 'companyos-refresh',
            iat: Math.floor(now / 1000),
            exp: Math.floor(refreshExp / 1000),
            session_id: session.sessionId,
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: this.config.accessTokenDurationSeconds,
            tokenType: 'Bearer',
            scope: requestedScopes || [],
        };
    }
    async generateServiceToken(identity, scopes, audience) {
        const now = Date.now();
        const exp = now + this.config.accessTokenDurationSeconds * 1000;
        return this.signToken({
            sub: identity.id,
            iss: 'companyos',
            aud: audience,
            iat: Math.floor(now / 1000),
            exp: Math.floor(exp / 1000),
            tenant_id: identity.tenantId,
            scope: scopes.join(' '),
            type: identity.type,
        });
    }
    signToken(payload) {
        const header = { alg: this.config.jwtAlgorithm, typ: 'JWT' };
        const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto_1.default
            .createHmac('sha256', this.config.jwtSecret)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url');
        return `${headerB64}.${payloadB64}.${signature}`;
    }
    async assessRisk(identity, clientInfo, tenant) {
        const factors = [];
        let score = 0;
        // New device
        if (clientInfo.deviceId) {
            const knownDevice = await this.isKnownDevice(identity.id, clientInfo.deviceId);
            if (!knownDevice) {
                factors.push('new_device');
                score += 0.2;
            }
        }
        else {
            factors.push('unknown_device');
            score += 0.3;
        }
        // Unusual location
        if (clientInfo.geoLocation) {
            const unusualLocation = await this.isUnusualLocation(identity.id, clientInfo.geoLocation);
            if (unusualLocation) {
                factors.push('unusual_location');
                score += 0.3;
            }
        }
        // Unusual time
        if (this.isUnusualTime(tenant)) {
            factors.push('unusual_time');
            score += 0.1;
        }
        // IP reputation
        const ipScore = await this.getIPReputationScore(clientInfo.ipAddress);
        if (ipScore > 0.5) {
            factors.push('suspicious_ip');
            score += ipScore * 0.3;
        }
        // Determine recommendation
        let recommendation = 'allow';
        if (score > 0.8) {
            recommendation = 'deny';
        }
        else if (score > 0.5) {
            recommendation = 'stepup';
        }
        else if (score > 0.3) {
            recommendation = 'mfa';
        }
        return { score: Math.min(score, 1), factors, recommendation };
    }
    isMfaRequired(user, tenant, riskAssessment) {
        // Tenant requires MFA
        if (tenant.settings.mfaRequired) {
            return true;
        }
        // User has MFA enabled
        if (user.mfaEnabled) {
            return true;
        }
        // Risk assessment recommends MFA
        if (riskAssessment.recommendation === 'mfa' || riskAssessment.recommendation === 'stepup') {
            return true;
        }
        // Sensitive clearance requires MFA
        if (['secret', 'top-secret', 'top-secret-sci'].includes(user.clearance)) {
            return true;
        }
        return false;
    }
    async createMFAChallenge(user) {
        const challengeId = crypto_1.default.randomUUID();
        // Determine available MFA methods for user
        const methods = ['totp'];
        if (user.metadata?.webauthnRegistered) {
            methods.unshift('webauthn');
        }
        return {
            challengeId,
            methods,
            expiresAt: new Date(Date.now() + 300000), // 5 minutes
        };
    }
    assessDeviceTrust(clientInfo) {
        if (!clientInfo.deviceId) {
            return 'untrusted';
        }
        if (clientInfo.deviceFingerprint) {
            return 'basic';
        }
        return 'untrusted';
    }
    getLockoutKey(request) {
        const creds = request.credentials;
        if ('email' in creds) {
            return `lockout:${request.tenantId}:${creds.email}`;
        }
        if ('keyId' in creds) {
            return `lockout:${request.tenantId}:${creds.keyId}`;
        }
        return `lockout:${request.tenantId}:${request.clientInfo.ipAddress}`;
    }
    checkLockout(key) {
        const record = this.loginAttempts.get(key);
        if (!record) {
            return null;
        }
        if (record.lockedUntil && record.lockedUntil > new Date()) {
            return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
        }
        return null;
    }
    recordFailedAttempt(key) {
        const record = this.loginAttempts.get(key) || { count: 0 };
        record.count++;
        if (record.count >= this.config.maxLoginAttempts) {
            record.lockedUntil = new Date(Date.now() + this.config.lockoutDurationSeconds * 1000);
        }
        this.loginAttempts.set(key, record);
    }
    authError(code, message, retryable, lockoutRemaining) {
        return {
            success: false,
            error: { code, message, retryable, lockoutRemaining },
        };
    }
    cleanupExpired() {
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
    async isKnownDevice(identityId, deviceId) {
        return false; // Conservative - assume unknown
    }
    async isUnusualLocation(identityId, location) {
        return false; // Would check against historical locations
    }
    isUnusualTime(tenant) {
        if (!tenant.settings.enforceBusinessHours) {
            return false;
        }
        const now = new Date();
        const hour = now.getUTCHours();
        // Default business hours: 6 AM - 10 PM
        return hour < 6 || hour >= 22;
    }
    async getIPReputationScore(ipAddress) {
        return 0; // Would check against IP reputation service
    }
}
exports.AuthenticationService = AuthenticationService;
