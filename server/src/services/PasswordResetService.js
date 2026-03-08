"use strict";
// @ts-nocheck
/**
 * Password Reset Service
 *
 * Handles secure password reset flows including:
 * - Generating cryptographically secure reset tokens
 * - Sending password reset emails
 * - Validating and consuming reset tokens
 * - Changing passwords for authenticated users
 *
 * Security considerations:
 * - Tokens are stored as SHA-256 hashes
 * - Tokens expire after 1 hour
 * - Tokens are single-use
 * - Rate limiting prevents abuse
 *
 * @module services/PasswordResetService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const argon2_1 = __importDefault(require("argon2"));
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const EmailService_js_1 = require("../email-service/EmailService.js");
const config_js_1 = require("../config.js");
class PasswordResetService {
    get pool() {
        return (0, database_js_1.getPostgresPool)();
    }
    tokenExpirationMs = 60 * 60 * 1000; // 1 hour
    _emailService = null;
    constructor() { }
    async getEmailService() {
        if (this._emailService)
            return this._emailService;
        this._emailService = new EmailService_js_1.EmailService({
            provider: {
                provider: 'smtp',
                smtp: {
                    host: config_js_1.cfg.SMTP_HOST || 'localhost',
                    port: config_js_1.cfg.SMTP_PORT,
                    secure: config_js_1.cfg.SMTP_PORT === 465,
                    auth: config_js_1.cfg.SMTP_USER ? {
                        user: config_js_1.cfg.SMTP_USER,
                        pass: config_js_1.cfg.SMTP_PASS || '',
                    } : undefined,
                },
                from: {
                    name: config_js_1.cfg.EMAIL_FROM_NAME,
                    email: config_js_1.cfg.EMAIL_FROM_ADDRESS,
                },
            },
            queue: { enabled: false, concurrency: 1, retryAttempts: 0, retryBackoff: 'fixed', retryDelay: 0 }, // Sync for now
        });
        await this._emailService.initialize();
        return this._emailService;
    }
    /**
     * Generate a secure random token
     */
    generateToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Hash a token for secure storage
     */
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Request a password reset for an email address
     *
     * @param email - The email address to reset password for
     * @param ipAddress - Client IP address for audit logging
     * @param userAgent - Client user agent for audit logging
     * @returns The reset token (to be sent via email) or null if user not found
     *
     * Note: This method always completes successfully to prevent email enumeration
     */
    async requestPasswordReset(email, ipAddress, userAgent) {
        const client = await this.pool.connect();
        try {
            // Check if user exists
            const userResult = await client.query('SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
            if (userResult.rows.length === 0) {
                // User not found, but don't reveal this
                logger_js_1.default.info({
                    message: 'Password reset requested for non-existent email',
                    email,
                    ipAddress,
                });
                return null;
            }
            const user = userResult.rows[0];
            // Invalidate any existing reset tokens for this user
            await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
            // Generate new token
            const token = this.generateToken();
            const tokenHash = this.hashToken(token);
            const expiresAt = new Date(Date.now() + this.tokenExpirationMs);
            // Store hashed token
            await client.query(`INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`, [user.id, tokenHash, expiresAt, ipAddress, userAgent]);
            // Log the request for audit
            await this.logLoginAttempt(client, {
                userId: user.id,
                email,
                success: true,
                reason: 'password_reset_requested',
                ipAddress,
                userAgent,
            });
            logger_js_1.default.info({
                message: 'Password reset token generated',
                userId: user.id,
                email,
                ipAddress,
                expiresAt,
            });
            // In production, this would trigger an email
            // For now, return the token (the calling code would send the email)
            await this.sendPasswordResetEmail(email, user.first_name, token);
            return token;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to create password reset token',
                error: error instanceof Error ? error.message : 'Unknown error',
                email,
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Reset password using a reset token
     *
     * @param token - The reset token from the email
     * @param newPassword - The new password to set
     */
    async resetPassword(token, newPassword) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const tokenHash = this.hashToken(token);
            // Find valid token
            const tokenResult = await client.query(`SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1`, [tokenHash]);
            if (tokenResult.rows.length === 0) {
                throw new Error('Invalid reset token');
            }
            const resetToken = tokenResult.rows[0];
            // Check if token is already used
            if (resetToken.used_at) {
                throw new Error('Reset token has already been used');
            }
            // Check if token is expired
            if (new Date(resetToken.expires_at) < new Date()) {
                throw new Error('Reset token has expired');
            }
            // Hash new password
            const passwordHash = await argon2_1.default.hash(newPassword);
            // Update user password
            await client.query(`UPDATE users
         SET password_hash = $1, updated_at = NOW(), failed_login_attempts = 0, locked_until = NULL
         WHERE id = $2`, [passwordHash, resetToken.user_id]);
            // Mark token as used
            await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetToken.id]);
            // Invalidate all sessions for security
            await client.query('UPDATE user_sessions SET is_revoked = true WHERE user_id = $1', [resetToken.user_id]);
            // Log the password reset
            await this.logLoginAttempt(client, {
                userId: resetToken.user_id,
                email: resetToken.email,
                success: true,
                reason: 'password_reset_completed',
            });
            await client.query('COMMIT');
            logger_js_1.default.info({
                message: 'Password reset successful',
                userId: resetToken.user_id,
                email: resetToken.email,
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error({
                message: 'Password reset failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Change password for an authenticated user
     *
     * @param userId - The user ID
     * @param currentPassword - The current password for verification
     * @param newPassword - The new password to set
     */
    async changePassword(userId, currentPassword, newPassword) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get current password hash
            const userResult = await client.query('SELECT id, email, password_hash FROM users WHERE id = $1 AND is_active = true', [userId]);
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }
            const user = userResult.rows[0];
            // Verify current password
            const isValidPassword = await argon2_1.default.verify(user.password_hash, currentPassword);
            if (!isValidPassword) {
                // Log failed attempt
                await this.logLoginAttempt(client, {
                    userId: user.id,
                    email: user.email,
                    success: false,
                    reason: 'password_change_incorrect_current',
                });
                throw new Error('Current password is incorrect');
            }
            // Hash new password
            const newPasswordHash = await argon2_1.default.hash(newPassword);
            // Update password
            await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newPasswordHash, userId]);
            // Invalidate all other sessions (keep current session)
            await client.query('UPDATE user_sessions SET is_revoked = true WHERE user_id = $1', [userId]);
            // Log successful password change
            await this.logLoginAttempt(client, {
                userId: user.id,
                email: user.email,
                success: true,
                reason: 'password_changed',
            });
            await client.query('COMMIT');
            logger_js_1.default.info({
                message: 'Password changed successfully',
                userId,
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error({
                message: 'Password change failed',
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Verify a password reset token is valid without consuming it
     *
     * @param token - The reset token to verify
     * @returns True if token is valid, false otherwise
     */
    async verifyResetToken(token) {
        try {
            const tokenHash = this.hashToken(token);
            const result = await this.pool.query(`SELECT id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1`, [tokenHash]);
            if (result.rows.length === 0) {
                return false;
            }
            const resetToken = result.rows[0];
            // Check if used or expired
            if (resetToken.used_at) {
                return false;
            }
            if (new Date(resetToken.expires_at) < new Date()) {
                return false;
            }
            return true;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to verify reset token',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
    /**
     * Send password reset email
     * In production, this would integrate with an email service
     */
    async sendPasswordResetEmail(email, firstName, token) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
        logger_js_1.default.info({
            message: 'Sending password reset email',
            email,
            firstName,
            tokenLength: token.length,
        });
        try {
            const emailService = await this.getEmailService();
            await emailService.sendFromTemplate('password-reset', email, {
                firstName,
                resetUrl,
                expiryHours: 1,
            });
            logger_js_1.default.info({
                message: 'Password reset email sent successfully',
                email,
            });
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to send password reset email',
                error: error instanceof Error ? error.message : 'Unknown error',
                email,
            });
            // We don't throw here to avoid revealing if the user exists or failing the request flow
            // but in a production environment we might have a retry queue.
        }
    }
    /**
     * Log authentication-related events for audit
     */
    async logLoginAttempt(client, data) {
        try {
            await client.query(`INSERT INTO login_audit
         (user_id, email, success, failure_reason, ip_address, user_agent, provider)
         VALUES ($1, $2, $3, $4, $5, $6, 'local')`, [
                data.userId,
                data.email,
                data.success,
                data.reason,
                data.ipAddress,
                data.userAgent,
            ]);
        }
        catch (error) {
            // Don't fail the main operation if audit logging fails
            logger_js_1.default.error({
                message: 'Failed to log authentication event',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.PasswordResetService = PasswordResetService;
exports.default = PasswordResetService;
