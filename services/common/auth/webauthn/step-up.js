"use strict";
/**
 * WebAuthn Step-Up Authentication
 * Sprint 27D: Short-lived privilege escalation with audit trail
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepUpRoutes = exports.WebAuthnStepUp = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WebAuthnStepUp {
    static TTL_SECONDS = 300; // 5 minutes
    static challenges = new Map();
    static tokens = new Map();
    /**
     * Generate step-up challenge
     */
    static async generateChallenge(userId, purpose) {
        const challengeId = crypto_1.default.randomUUID();
        const challenge = crypto_1.default.randomBytes(32).toString('base64url');
        const now = Date.now();
        const challengeData = {
            challengeId,
            challenge,
            userId,
            purpose,
            createdAt: now,
            expiresAt: now + 60 * 1000, // 1 minute to complete
        };
        this.challenges.set(challengeId, challengeData);
        // Cleanup expired challenges
        this.cleanupExpired();
        return challengeData;
    }
    /**
     * Verify WebAuthn response and issue step-up token
     */
    static async verifyAndIssueToken(challengeId, webauthnResponse, purpose) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            throw new Error('Challenge not found or expired');
        }
        if (challenge.expiresAt < Date.now()) {
            this.challenges.delete(challengeId);
            throw new Error('Challenge expired');
        }
        // In production: verify WebAuthn response against challenge
        // For demo: simplified verification
        const isValid = webauthnResponse?.response?.clientDataJSON &&
            webauthnResponse?.response?.authenticatorData;
        if (!isValid) {
            throw new Error('Invalid WebAuthn response');
        }
        // Issue step-up token
        const now = Date.now();
        const token = {
            userId: challenge.userId,
            issuedAt: now,
            expiresAt: now + this.TTL_SECONDS * 1000,
            scope: this.getScopeForPurpose(purpose),
            audience: 'intelgraph-api',
            purpose,
            signature: this.signToken(challenge.userId, purpose, now),
        };
        const tokenId = crypto_1.default.randomUUID();
        this.tokens.set(tokenId, token);
        // Clean up used challenge
        this.challenges.delete(challengeId);
        // Audit log
        console.log(JSON.stringify({
            event: 'stepup_token_issued',
            userId: token.userId,
            purpose: token.purpose,
            scope: token.scope,
            expiresAt: new Date(token.expiresAt).toISOString(),
            timestamp: new Date().toISOString(),
        }));
        return token;
    }
    /**
     * Verify step-up token
     */
    static verifyToken(tokenId, requiredPurpose) {
        const token = this.tokens.get(tokenId);
        if (!token) {
            return null;
        }
        if (token.expiresAt < Date.now()) {
            this.tokens.delete(tokenId);
            return null;
        }
        if (requiredPurpose && token.purpose !== requiredPurpose) {
            return null;
        }
        // Verify signature
        const expectedSignature = this.signToken(token.userId, token.purpose, token.issuedAt);
        if (token.signature !== expectedSignature) {
            return null;
        }
        return token;
    }
    /**
     * Revoke step-up token (logout)
     */
    static revokeToken(tokenId) {
        return this.tokens.delete(tokenId);
    }
    /**
     * Middleware to require step-up authentication
     */
    static requireStepUp(purpose) {
        return (req, res, next) => {
            const stepupToken = req.headers['x-stepup-token'];
            const purposeHeader = req.headers['x-purpose'];
            if (!stepupToken) {
                return res.status(401).json({
                    error: 'Step-up authentication required',
                    purpose: purpose,
                    remediation_url: '/auth/stepup/challenge',
                });
            }
            if (!purposeHeader) {
                return res.status(400).json({
                    error: 'Purpose header required',
                    required_header: 'x-purpose',
                });
            }
            const token = this.verifyToken(stepupToken, purpose);
            if (!token) {
                return res.status(401).json({
                    error: 'Invalid or expired step-up token',
                    purpose: purpose,
                    remediation_url: '/auth/stepup/challenge',
                });
            }
            // Add token info to request
            req.stepUpToken = token;
            req.purpose = purposeHeader;
            // Audit log
            console.log(JSON.stringify({
                event: 'stepup_access_granted',
                userId: token.userId,
                purpose: purposeHeader,
                endpoint: req.path,
                method: req.method,
                timestamp: new Date().toISOString(),
            }));
            next();
        };
    }
    static getScopeForPurpose(purpose) {
        const scopeMap = {
            admin: ['read', 'write', 'delete', 'admin'],
            ops: ['read', 'write', 'export'],
            legal: ['read', 'export', 'pii'],
            compliance: ['read', 'export', 'audit'],
            investigation: ['read', 'write'],
        };
        return scopeMap[purpose] || ['read'];
    }
    static signToken(userId, purpose, issuedAt) {
        const secret = process.env.STEPUP_SECRET || 'demo-secret-change-in-production';
        const data = `${userId}:${purpose}:${issuedAt}`;
        return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
    }
    static cleanupExpired() {
        const now = Date.now();
        // Cleanup expired challenges
        for (const [id, challenge] of this.challenges.entries()) {
            if (challenge.expiresAt < now) {
                this.challenges.delete(id);
            }
        }
        // Cleanup expired tokens
        for (const [id, token] of this.tokens.entries()) {
            if (token.expiresAt < now) {
                this.tokens.delete(id);
            }
        }
    }
}
exports.WebAuthnStepUp = WebAuthnStepUp;
// Express route handlers
exports.stepUpRoutes = {
    /**
     * POST /auth/stepup/challenge
     */
    async challenge(req, res) {
        try {
            const { purpose } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!purpose) {
                return res.status(400).json({ error: 'Purpose required' });
            }
            const challenge = await WebAuthnStepUp.generateChallenge(userId, purpose);
            res.json({
                challengeId: challenge.challengeId,
                challenge: challenge.challenge,
                purpose: challenge.purpose,
                expiresAt: new Date(challenge.expiresAt).toISOString(),
            });
        }
        catch (error) {
            console.error('StepUp challenge error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    /**
     * POST /auth/stepup/verify
     */
    async verify(req, res) {
        try {
            const { challengeId, webauthnResponse, purpose } = req.body;
            if (!challengeId || !webauthnResponse || !purpose) {
                return res.status(400).json({
                    error: 'challengeId, webauthnResponse, and purpose required',
                });
            }
            const token = await WebAuthnStepUp.verifyAndIssueToken(challengeId, webauthnResponse, purpose);
            if (!token) {
                return res.status(401).json({ error: 'Verification failed' });
            }
            res.json({
                token: crypto_1.default.randomUUID(), // Return token ID, not token itself
                expiresAt: new Date(token.expiresAt).toISOString(),
                scope: token.scope,
                purpose: token.purpose,
            });
        }
        catch (error) {
            console.error('StepUp verification error:', error);
            res.status(401).json({ error: error.message });
        }
    },
    /**
     * POST /auth/stepup/revoke
     */
    async revoke(req, res) {
        try {
            const tokenId = req.headers['x-stepup-token'];
            if (!tokenId) {
                return res.status(400).json({ error: 'Token ID required' });
            }
            const revoked = WebAuthnStepUp.revokeToken(tokenId);
            res.json({ revoked });
        }
        catch (error) {
            console.error('StepUp revocation error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
};
