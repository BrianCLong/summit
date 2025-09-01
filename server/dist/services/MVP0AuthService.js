/**
 * MVP-0 Authentication & Authorization Service
 * Requirements:
 * - Argon2id for password hashing
 * - JWT RS256 with refresh token rotation
 * - Redis denylist for revoked tokens
 * - Role-based access control (viewer|editor|owner)
 * - Security: rate limiting, reuse detection, audit logging
 */
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { getRedisClient } from '../db/redis';
import { getPostgresPool } from '../db/postgres';
const logger = pino();
export class MVP0AuthService {
    constructor() {
        this.redis = getRedisClient();
        this.postgres = getPostgresPool();
        // Configuration
        this.JWT_ALGORITHM = 'RS256';
        this.ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
        this.REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 15 * 60; // 15 minutes
        this.SESSION_TTL = 24 * 60 * 60; // 24 hours
        // JWT keys (would be loaded from environment in production)
        this.privateKey = process.env.JWT_PRIVATE_KEY || this.generateDefaultKey();
        this.publicKey = process.env.JWT_PUBLIC_KEY || this.generateDefaultKey();
        if (!process.env.JWT_PRIVATE_KEY) {
            logger.warn('Using default JWT keys - set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in production');
        }
    }
    /**
     * Register a new user with Argon2id hashing
     */
    async register(data) {
        const { email, password, role = 'viewer', tenantId } = data;
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        // Validate password strength
        this.validatePassword(password);
        const client = await this.postgres.connect();
        try {
            // Check if user exists
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                throw new Error('User already exists');
            }
            // Hash password with Argon2id
            const passwordHash = await argon2.hash(password, {
                type: argon2.argon2id,
                memoryCost: 2 ** 16, // 64MB
                timeCost: 3, // 3 iterations
                parallelism: 1, // 1 thread
            });
            // Create user
            const userId = uuidv4();
            const now = new Date();
            const result = await client.query(`INSERT INTO users (id, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)
         RETURNING id, email, role, tenant_id, is_active, created_at, updated_at`, [userId, email, passwordHash, role, tenantId, now, now]);
            const user = {
                id: result.rows[0].id,
                email: result.rows[0].email,
                role: result.rows[0].role,
                tenantId: result.rows[0].tenant_id,
                isActive: result.rows[0].is_active,
                lastLogin: null,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at,
            };
            // Log registration
            await this.logAuthEvent('user_registered', { userId, email, role, tenantId });
            return {
                user,
                message: 'User registered successfully'
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Authenticate user and return JWT tokens
     */
    async login(data) {
        const { email, password, ipAddress, userAgent } = data;
        // Check rate limiting
        await this.checkRateLimit(email, ipAddress);
        const client = await this.postgres.connect();
        try {
            // Get user
            const userResult = await client.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
            if (userResult.rows.length === 0) {
                await this.logLoginAttempt({
                    email,
                    ipAddress,
                    userAgent,
                    success: false,
                    timestamp: new Date(),
                    reason: 'user_not_found'
                });
                throw new Error('Invalid credentials');
            }
            const user = userResult.rows[0];
            // Verify password with Argon2id
            const isValidPassword = await argon2.verify(user.password_hash, password);
            if (!isValidPassword) {
                await this.logLoginAttempt({
                    email,
                    ipAddress,
                    userAgent,
                    success: false,
                    timestamp: new Date(),
                    reason: 'invalid_password'
                });
                await this.incrementLoginAttempts(email, ipAddress);
                throw new Error('Invalid credentials');
            }
            // Update last login
            await client.query('UPDATE users SET last_login = $1, updated_at = $2 WHERE id = $3', [new Date(), new Date(), user.id]);
            // Create session
            const sessionId = uuidv4();
            const authResult = await this.createSession(user, sessionId, ipAddress, userAgent);
            // Log successful login
            await this.logLoginAttempt({
                email,
                ipAddress,
                userAgent,
                success: true,
                timestamp: new Date()
            });
            // Clear rate limiting on successful login
            await this.clearRateLimit(email, ipAddress);
            return authResult;
        }
        finally {
            client.release();
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken, ipAddress) {
        const client = await this.postgres.connect();
        try {
            // Get refresh token data
            const tokenResult = await client.query(`SELECT rt.*, u.email, u.role, u.tenant_id, u.is_active 
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 AND rt.expires_at > $2 AND rt.used = false AND rt.revoked_at IS NULL`, [this.hashToken(refreshToken), new Date()]);
            if (tokenResult.rows.length === 0) {
                throw new Error('Invalid or expired refresh token');
            }
            const tokenData = tokenResult.rows[0];
            // Check for reuse detection
            const usedResult = await client.query('SELECT id FROM refresh_tokens WHERE token_hash = $1 AND used = true', [this.hashToken(refreshToken)]);
            if (usedResult.rows.length > 0) {
                // Token reuse detected - revoke all tokens for this session
                await this.revokeSession(tokenData.session_id, 'token_reuse_detected');
                throw new Error('Token reuse detected - session revoked');
            }
            // Mark current refresh token as used
            await client.query('UPDATE refresh_tokens SET used = true WHERE id = $1', [tokenData.id]);
            // Create new session with token rotation
            const user = {
                id: tokenData.user_id,
                email: tokenData.email,
                role: tokenData.role,
                tenantId: tokenData.tenant_id,
                isActive: tokenData.is_active,
            };
            const newAuthResult = await this.createSession(user, tokenData.session_id, ipAddress, 'refresh');
            // Log token refresh
            await this.logAuthEvent('token_refreshed', {
                userId: user.id,
                sessionId: tokenData.session_id,
                ipAddress
            });
            return newAuthResult;
        }
        finally {
            client.release();
        }
    }
    /**
     * Logout user and revoke tokens
     */
    async logout(accessToken) {
        try {
            const payload = this.verifyAccessToken(accessToken);
            // Revoke session
            await this.revokeSession(payload.sessionId, 'user_logout');
            // Add token to denylist
            await this.addToDenylist(payload.tokenId, payload.exp);
            // Log logout
            await this.logAuthEvent('user_logout', {
                userId: payload.userId,
                sessionId: payload.sessionId
            });
            return { message: 'Logged out successfully' };
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    /**
     * Verify access token and return payload
     */
    verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, this.publicKey, {
                algorithms: [this.JWT_ALGORITHM],
                issuer: 'intelgraph-mvp0',
                audience: 'intelgraph-api'
            });
            return payload;
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }
    /**
     * Check if token is in denylist
     */
    async isTokenDenylisted(tokenId) {
        const result = await this.redis.exists(`denylist:${tokenId}`);
        return result === 1;
    }
    /**
     * Get user by ID with role information
     */
    async getUserById(userId) {
        const client = await this.postgres.connect();
        try {
            const result = await client.query('SELECT id, email, role, tenant_id, is_active, last_login, created_at, updated_at FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return {
                id: result.rows[0].id,
                email: result.rows[0].email,
                role: result.rows[0].role,
                tenantId: result.rows[0].tenant_id,
                isActive: result.rows[0].is_active,
                lastLogin: result.rows[0].last_login,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Change user password with current password verification
     */
    async changePassword(userId, currentPassword, newPassword) {
        this.validatePassword(newPassword);
        const client = await this.postgres.connect();
        try {
            // Get current password hash
            const userResult = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }
            // Verify current password
            const isValid = await argon2.verify(userResult.rows[0].password_hash, currentPassword);
            if (!isValid) {
                throw new Error('Current password is incorrect');
            }
            // Hash new password
            const newPasswordHash = await argon2.hash(newPassword, {
                type: argon2.argon2id,
                memoryCost: 2 ** 16,
                timeCost: 3,
                parallelism: 1,
            });
            // Update password
            await client.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [newPasswordHash, new Date(), userId]);
            // Revoke all user sessions (force re-login)
            await this.revokeAllUserSessions(userId, 'password_changed');
            // Log password change
            await this.logAuthEvent('password_changed', { userId });
            return { message: 'Password changed successfully' };
        }
        finally {
            client.release();
        }
    }
    /**
     * Private helper methods
     */
    async createSession(user, sessionId, ipAddress, userAgent) {
        const now = new Date();
        const accessTokenExp = Math.floor(now.getTime() / 1000) + this.ACCESS_TOKEN_TTL;
        const refreshTokenExp = new Date(now.getTime() + (this.REFRESH_TOKEN_TTL * 1000));
        // Create token IDs
        const accessTokenId = uuidv4();
        const refreshTokenValue = this.generateSecureToken();
        const refreshTokenHash = this.hashToken(refreshTokenValue);
        // Create JWT payload
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            sessionId,
            tokenId: accessTokenId,
        };
        // Create access token
        const accessToken = jwt.sign(payload, this.privateKey, {
            algorithm: this.JWT_ALGORITHM,
            expiresIn: this.ACCESS_TOKEN_TTL,
            issuer: 'intelgraph-mvp0',
            audience: 'intelgraph-api',
            jwtid: accessTokenId,
        });
        // Store refresh token
        const client = await this.postgres.connect();
        try {
            await client.query(`INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, token_id, expires_at, created_at, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [uuidv4(), user.id, sessionId, refreshTokenHash, uuidv4(), refreshTokenExp, now, ipAddress]);
        }
        finally {
            client.release();
        }
        // Store session in Redis
        await this.redis.setex(`session:${sessionId}`, this.SESSION_TTL, JSON.stringify({
            userId: user.id,
            ipAddress,
            userAgent,
            createdAt: now,
        }));
        const userResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            isActive: user.isActive,
            lastLogin: user.lastLogin || now,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        return {
            accessToken,
            refreshToken: refreshTokenValue,
            user: userResponse,
            expiresIn: this.ACCESS_TOKEN_TTL,
            sessionId,
        };
    }
    async addToDenylist(tokenId, exp) {
        const ttl = exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            await this.redis.setex(`denylist:${tokenId}`, ttl, '1');
        }
    }
    async revokeSession(sessionId, reason) {
        const client = await this.postgres.connect();
        try {
            // Revoke all refresh tokens for session
            await client.query('UPDATE refresh_tokens SET revoked_at = $1 WHERE session_id = $2 AND revoked_at IS NULL', [new Date(), sessionId]);
            // Remove session from Redis
            await this.redis.del(`session:${sessionId}`);
            // Log session revocation
            await this.logAuthEvent('session_revoked', { sessionId, reason });
        }
        finally {
            client.release();
        }
    }
    async revokeAllUserSessions(userId, reason) {
        const client = await this.postgres.connect();
        try {
            // Get all active sessions for user
            const sessions = await client.query('SELECT DISTINCT session_id FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
            // Revoke all sessions
            for (const session of sessions.rows) {
                await this.revokeSession(session.session_id, reason);
            }
        }
        finally {
            client.release();
        }
    }
    async checkRateLimit(email, ipAddress) {
        const emailKey = `login_attempts:email:${email}`;
        const ipKey = `login_attempts:ip:${ipAddress}`;
        const [emailAttempts, ipAttempts] = await Promise.all([
            this.redis.get(emailKey),
            this.redis.get(ipKey)
        ]);
        if (parseInt(emailAttempts || '0') >= this.MAX_LOGIN_ATTEMPTS) {
            throw new Error('Account temporarily locked due to too many failed attempts');
        }
        if (parseInt(ipAttempts || '0') >= this.MAX_LOGIN_ATTEMPTS) {
            throw new Error('IP temporarily blocked due to too many failed attempts');
        }
    }
    async incrementLoginAttempts(email, ipAddress) {
        const emailKey = `login_attempts:email:${email}`;
        const ipKey = `login_attempts:ip:${ipAddress}`;
        await Promise.all([
            this.redis.incr(emailKey),
            this.redis.expire(emailKey, this.LOCKOUT_DURATION),
            this.redis.incr(ipKey),
            this.redis.expire(ipKey, this.LOCKOUT_DURATION)
        ]);
    }
    async clearRateLimit(email, ipAddress) {
        const emailKey = `login_attempts:email:${email}`;
        const ipKey = `login_attempts:ip:${ipAddress}`;
        await Promise.all([
            this.redis.del(emailKey),
            this.redis.del(ipKey)
        ]);
    }
    validatePassword(password) {
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            throw new Error('Password must contain uppercase, lowercase, digit, and special character');
        }
    }
    generateSecureToken() {
        return randomBytes(32).toString('hex');
    }
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    generateDefaultKey() {
        // In production, use proper RS256 keys
        return randomBytes(256).toString('hex');
    }
    async logAuthEvent(event, data) {
        try {
            const client = await this.postgres.connect();
            await client.query('INSERT INTO audit_events (id, type, actor_id, created_at, meta) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), event, data.userId || null, new Date(), data]);
            client.release();
        }
        catch (error) {
            logger.error('Failed to log auth event', { event, error });
        }
    }
    async logLoginAttempt(attempt) {
        try {
            const client = await this.postgres.connect();
            await client.query(`INSERT INTO login_attempts (id, email, ip_address, user_agent, success, timestamp, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [uuidv4(), attempt.email, attempt.ipAddress, attempt.userAgent, attempt.success, attempt.timestamp, attempt.reason]);
            client.release();
        }
        catch (error) {
            logger.error('Failed to log login attempt', { attempt, error });
        }
    }
}
export default MVP0AuthService;
//# sourceMappingURL=MVP0AuthService.js.map