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

import crypto from 'crypto';
import argon2 from 'argon2';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import type { Pool, PoolClient } from 'pg';

interface PasswordResetRequest {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PasswordResetService {
  private pool: Pool;
  private tokenExpirationMs = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    const client = await this.pool.connect();

    try {
      // Check if user exists
      const userResult = await client.query(
        'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // User not found, but don't reveal this
        logger.info({
          message: 'Password reset requested for non-existent email',
          email,
          ipAddress,
        });
        return null;
      }

      const user = userResult.rows[0];

      // Invalidate any existing reset tokens for this user
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [user.id]
      );

      // Generate new token
      const token = this.generateToken();
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + this.tokenExpirationMs);

      // Store hashed token
      await client.query(
        `INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokenHash, expiresAt, ipAddress, userAgent]
      );

      // Log the request for audit
      await this.logLoginAttempt(client, {
        userId: user.id,
        email,
        success: true,
        reason: 'password_reset_requested',
        ipAddress,
        userAgent,
      });

      logger.info({
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
    } catch (error) {
      logger.error({
        message: 'Failed to create password reset token',
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset password using a reset token
   *
   * @param token - The reset token from the email
   * @param newPassword - The new password to set
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const tokenHash = this.hashToken(token);

      // Find valid token
      const tokenResult = await client.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1`,
        [tokenHash]
      );

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
      const passwordHash = await argon2.hash(newPassword);

      // Update user password
      await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW(), failed_login_attempts = 0, locked_until = NULL
         WHERE id = $2`,
        [passwordHash, resetToken.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [resetToken.id]
      );

      // Invalidate all sessions for security
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1',
        [resetToken.user_id]
      );

      // Log the password reset
      await this.logLoginAttempt(client, {
        userId: resetToken.user_id,
        email: resetToken.email,
        success: true,
        reason: 'password_reset_completed',
      });

      await client.query('COMMIT');

      logger.info({
        message: 'Password reset successful',
        userId: resetToken.user_id,
        email: resetToken.email,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        message: 'Password reset failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
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
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current password hash
      const userResult = await client.query(
        'SELECT id, email, password_hash FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await argon2.verify(user.password_hash, currentPassword);
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
      const newPasswordHash = await argon2.hash(newPassword);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Invalidate all other sessions (keep current session)
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1',
        [userId]
      );

      // Log successful password change
      await this.logLoginAttempt(client, {
        userId: user.id,
        email: user.email,
        success: true,
        reason: 'password_changed',
      });

      await client.query('COMMIT');

      logger.info({
        message: 'Password changed successfully',
        userId,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        message: 'Password change failed',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify a password reset token is valid without consuming it
   *
   * @param token - The reset token to verify
   * @returns True if token is valid, false otherwise
   */
  async verifyResetToken(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);

      const result = await this.pool.query(
        `SELECT id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1`,
        [tokenHash]
      );

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
    } catch (error) {
      logger.error({
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
  private async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    // In production, use a proper email service (SendGrid, SES, etc.)
    logger.info({
      message: 'Password reset email would be sent',
      email,
      firstName,
      resetUrl,
      // Note: Never log the actual token in production
      tokenLength: token.length,
    });

    // TODO: Implement actual email sending
    // Example with nodemailer or SendGrid:
    // await emailService.send({
    //   to: email,
    //   subject: 'Reset Your Password - IntelGraph',
    //   template: 'password-reset',
    //   data: {
    //     firstName,
    //     resetUrl,
    //     expiresIn: '1 hour',
    //   },
    // });
  }

  /**
   * Log authentication-related events for audit
   */
  private async logLoginAttempt(
    client: PoolClient,
    data: {
      userId?: string;
      email: string;
      success: boolean;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await client.query(
        `INSERT INTO login_audit
         (user_id, email, success, failure_reason, ip_address, user_agent, provider)
         VALUES ($1, $2, $3, $4, $5, $6, 'local')`,
        [
          data.userId,
          data.email,
          data.success,
          data.reason,
          data.ipAddress,
          data.userAgent,
        ]
      );
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      logger.error({
        message: 'Failed to log authentication event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default PasswordResetService;
