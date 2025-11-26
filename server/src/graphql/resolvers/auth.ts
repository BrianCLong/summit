/**
 * Authentication GraphQL Resolvers
 *
 * Provides GraphQL mutations and queries for user authentication:
 * - User registration
 * - User login
 * - Token refresh
 * - Logout
 * - Password reset
 * - Current user profile
 *
 * @module graphql/resolvers/auth
 */

import { GraphQLError } from 'graphql';
import { AuthService } from '../../services/AuthService.js';
import { PasswordResetService } from '../../services/PasswordResetService.js';
import {
  recordFailedLogin,
  clearFailedLogins,
} from '../../middleware/authRateLimit.js';
import logger from '../../utils/logger.js';

const authService = new AuthService();
const passwordResetService = new PasswordResetService();

// Input validation helpers
function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new GraphQLError('Invalid email address', {
      extensions: { code: 'VALIDATION_ERROR', field: 'email' },
    });
  }
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new GraphQLError('Password must be at least 8 characters', {
      extensions: { code: 'VALIDATION_ERROR', field: 'password' },
    });
  }
  if (!/[A-Z]/.test(password)) {
    throw new GraphQLError('Password must contain at least one uppercase letter', {
      extensions: { code: 'VALIDATION_ERROR', field: 'password' },
    });
  }
  if (!/[a-z]/.test(password)) {
    throw new GraphQLError('Password must contain at least one lowercase letter', {
      extensions: { code: 'VALIDATION_ERROR', field: 'password' },
    });
  }
  if (!/[0-9]/.test(password)) {
    throw new GraphQLError('Password must contain at least one number', {
      extensions: { code: 'VALIDATION_ERROR', field: 'password' },
    });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new GraphQLError('Password must contain at least one special character', {
      extensions: { code: 'VALIDATION_ERROR', field: 'password' },
    });
  }
}

const authResolvers = {
  Query: {
    /**
     * Get the currently authenticated user's profile
     */
    me: async (_: any, __: any, context: any) => {
      if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return {
        id: context.user.id,
        email: context.user.email,
        username: context.user.username,
        firstName: context.user.firstName,
        lastName: context.user.lastName,
        fullName: context.user.fullName,
        role: context.user.role,
        isActive: context.user.isActive,
        lastLogin: context.user.lastLogin,
        createdAt: context.user.createdAt,
        updatedAt: context.user.updatedAt,
      };
    },

    /**
     * Verify if a token is valid
     */
    verifyToken: async (_: any, { token }: { token: string }) => {
      try {
        const user = await authService.verifyToken(token);
        return {
          valid: !!user,
          user: user
            ? {
                id: user.id,
                email: user.email,
                role: user.role,
              }
            : null,
        };
      } catch (error) {
        return { valid: false, user: null };
      }
    },

    /**
     * Verify if a password reset token is valid
     */
    verifyResetToken: async (_: any, { token }: { token: string }) => {
      const isValid = await passwordResetService.verifyResetToken(token);
      return { valid: isValid };
    },
  },

  Mutation: {
    /**
     * Register a new user account
     */
    register: async (
      _: any,
      {
        input,
      }: {
        input: {
          email: string;
          password: string;
          username?: string;
          firstName: string;
          lastName: string;
        };
      },
      context: any
    ) => {
      const { email, password, username, firstName, lastName } = input;

      // Validate input
      validateEmail(email);
      validatePassword(password);

      if (!firstName || firstName.length < 1) {
        throw new GraphQLError('First name is required', {
          extensions: { code: 'VALIDATION_ERROR', field: 'firstName' },
        });
      }

      if (!lastName || lastName.length < 1) {
        throw new GraphQLError('Last name is required', {
          extensions: { code: 'VALIDATION_ERROR', field: 'lastName' },
        });
      }

      try {
        const result = await authService.register({
          email: email.toLowerCase(),
          password,
          username: username || email.split('@')[0],
          firstName,
          lastName,
          role: 'VIEWER', // Default role for new registrations
        });

        logger.info({
          message: 'User registered via GraphQL',
          userId: result.user.id,
          email: result.user.email,
          ip: context.req?.ip,
        });

        return {
          success: true,
          message: 'Registration successful',
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            createdAt: result.user.createdAt,
          },
          token: result.token,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        };
      } catch (error: any) {
        logger.error({
          message: 'Registration failed via GraphQL',
          error: error.message,
          email,
          ip: context.req?.ip,
        });

        if (error.message.includes('already exists')) {
          throw new GraphQLError('User with this email or username already exists', {
            extensions: { code: 'USER_EXISTS' },
          });
        }

        throw new GraphQLError('Registration failed', {
          extensions: { code: 'REGISTRATION_FAILED' },
        });
      }
    },

    /**
     * Authenticate user and return tokens
     */
    login: async (
      _: any,
      { email, password }: { email: string; password: string },
      context: any
    ) => {
      validateEmail(email);

      const ip = context.req?.ip || 'unknown';
      const userAgent = context.req?.get?.('User-Agent') || '';

      try {
        const result = await authService.login(email.toLowerCase(), password, ip, userAgent);

        // Clear failed login attempts on success
        await clearFailedLogins(ip, email.toLowerCase());

        logger.info({
          message: 'User logged in via GraphQL',
          userId: result.user.id,
          email: result.user.email,
          ip,
        });

        return {
          success: true,
          message: 'Login successful',
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            fullName: result.user.fullName,
            role: result.user.role,
            lastLogin: result.user.lastLogin,
          },
          token: result.token,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        };
      } catch (error: any) {
        // Record failed attempt
        await recordFailedLogin(ip, email.toLowerCase());

        logger.warn({
          message: 'Login failed via GraphQL',
          email,
          ip,
          error: error.message,
        });

        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }
    },

    /**
     * Refresh access token using refresh token
     */
    refreshToken: async (
      _: any,
      { refreshToken }: { refreshToken: string },
      context: any
    ) => {
      try {
        const result = await authService.refreshAccessToken(refreshToken);

        if (!result) {
          throw new GraphQLError('Invalid or expired refresh token', {
            extensions: { code: 'INVALID_REFRESH_TOKEN' },
          });
        }

        logger.info({
          message: 'Token refreshed via GraphQL',
          ip: context.req?.ip,
        });

        return {
          success: true,
          token: result.token,
          refreshToken: result.refreshToken,
        };
      } catch (error: any) {
        logger.error({
          message: 'Token refresh failed via GraphQL',
          error: error.message,
          ip: context.req?.ip,
        });

        throw new GraphQLError('Token refresh failed', {
          extensions: { code: 'REFRESH_FAILED' },
        });
      }
    },

    /**
     * Logout user and invalidate tokens
     */
    logout: async (_: any, __: any, context: any) => {
      if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const token = context.req?.headers?.authorization?.replace('Bearer ', '');
        await authService.logout(context.user.id, token);

        logger.info({
          message: 'User logged out via GraphQL',
          userId: context.user.id,
          ip: context.req?.ip,
        });

        return {
          success: true,
          message: 'Logout successful',
        };
      } catch (error: any) {
        logger.error({
          message: 'Logout failed via GraphQL',
          error: error.message,
          userId: context.user?.id,
          ip: context.req?.ip,
        });

        throw new GraphQLError('Logout failed', {
          extensions: { code: 'LOGOUT_FAILED' },
        });
      }
    },

    /**
     * Request password reset email
     */
    requestPasswordReset: async (
      _: any,
      { email }: { email: string },
      context: any
    ) => {
      validateEmail(email);

      try {
        await passwordResetService.requestPasswordReset(
          email.toLowerCase(),
          context.req?.ip,
          context.req?.get?.('User-Agent')
        );

        // Always return success to prevent email enumeration
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent',
        };
      } catch (error: any) {
        logger.error({
          message: 'Password reset request failed via GraphQL',
          error: error.message,
          email,
          ip: context.req?.ip,
        });

        // Still return success to prevent enumeration
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent',
        };
      }
    },

    /**
     * Reset password using reset token
     */
    resetPassword: async (
      _: any,
      { token, newPassword }: { token: string; newPassword: string },
      context: any
    ) => {
      validatePassword(newPassword);

      try {
        await passwordResetService.resetPassword(token, newPassword);

        logger.info({
          message: 'Password reset successful via GraphQL',
          ip: context.req?.ip,
        });

        return {
          success: true,
          message: 'Password reset successful. Please log in with your new password.',
        };
      } catch (error: any) {
        logger.warn({
          message: 'Password reset failed via GraphQL',
          error: error.message,
          ip: context.req?.ip,
        });

        if (error.message.includes('expired') || error.message.includes('invalid')) {
          throw new GraphQLError('Invalid or expired reset token', {
            extensions: { code: 'INVALID_RESET_TOKEN' },
          });
        }

        throw new GraphQLError('Password reset failed', {
          extensions: { code: 'RESET_FAILED' },
        });
      }
    },

    /**
     * Change password for authenticated user
     */
    changePassword: async (
      _: any,
      {
        currentPassword,
        newPassword,
      }: { currentPassword: string; newPassword: string },
      context: any
    ) => {
      if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      validatePassword(newPassword);

      try {
        await passwordResetService.changePassword(
          context.user.id,
          currentPassword,
          newPassword
        );

        logger.info({
          message: 'Password changed via GraphQL',
          userId: context.user.id,
          ip: context.req?.ip,
        });

        return {
          success: true,
          message: 'Password changed successfully',
        };
      } catch (error: any) {
        logger.warn({
          message: 'Password change failed via GraphQL',
          error: error.message,
          userId: context.user.id,
          ip: context.req?.ip,
        });

        if (error.message.includes('incorrect')) {
          throw new GraphQLError('Current password is incorrect', {
            extensions: { code: 'INCORRECT_PASSWORD' },
          });
        }

        throw new GraphQLError('Password change failed', {
          extensions: { code: 'CHANGE_FAILED' },
        });
      }
    },

    /**
     * Revoke a specific token
     */
    revokeToken: async (
      _: any,
      { token }: { token: string },
      context: any
    ) => {
      if (!context.isAuthenticated || !context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        await authService.revokeToken(token);

        logger.info({
          message: 'Token revoked via GraphQL',
          userId: context.user.id,
          ip: context.req?.ip,
        });

        return {
          success: true,
          message: 'Token revoked successfully',
        };
      } catch (error: any) {
        logger.error({
          message: 'Token revocation failed via GraphQL',
          error: error.message,
          ip: context.req?.ip,
        });

        throw new GraphQLError('Token revocation failed', {
          extensions: { code: 'REVOCATION_FAILED' },
        });
      }
    },
  },
};

export default authResolvers;
