"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const AuthService_js_1 = require("../../services/AuthService.js");
const PasswordResetService_js_1 = require("../../services/PasswordResetService.js");
const authRateLimit_js_1 = require("../../middleware/authRateLimit.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const auth_schema_js_1 = require("../validation/auth.schema.js");
const authService = new AuthService_js_1.AuthService();
const passwordResetService = new PasswordResetService_js_1.PasswordResetService();
// Helper to handle Zod Errors
function validateInput(schema, input) {
    try {
        return schema.parse(input);
    }
    catch (error) {
        const zodError = error;
        if (zodError.errors && Array.isArray(zodError.errors) && zodError.errors.length > 0) {
            const firstError = zodError.errors[0];
            throw new graphql_1.GraphQLError(firstError.message, {
                extensions: {
                    code: 'GRAPHQL_VALIDATION_FAILED', // Use standard code we allow in production
                    field: firstError.path.join('.'),
                    issues: zodError.errors
                },
            });
        }
        throw error;
    }
}
const authResolvers = {
    Query: {
        /**
         * Get the currently authenticated user's profile
         */
        me: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new graphql_1.GraphQLError('Authentication required', {
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
        verifyToken: async (_, { token }) => {
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
            }
            catch (error) {
                return { valid: false, user: null };
            }
        },
        /**
         * Verify if a password reset token is valid
         */
        verifyResetToken: async (_, { token }) => {
            const isValid = await passwordResetService.verifyResetToken(token);
            return { valid: isValid };
        },
    },
    Mutation: {
        /**
         * Register a new user account
         */
        register: async (_, { input, }, context) => {
            const { email, password, username, firstName, lastName } = input;
            // Validate input
            validateInput(auth_schema_js_1.registerSchema, input);
            if (!firstName || firstName.length < 1) {
                throw new graphql_1.GraphQLError('First name is required', {
                    extensions: { code: 'VALIDATION_ERROR', field: 'firstName' },
                });
            }
            if (!lastName || lastName.length < 1) {
                throw new graphql_1.GraphQLError('Last name is required', {
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
                logger_js_1.default.info({
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
            }
            catch (error) {
                logger_js_1.default.error({
                    message: 'Registration failed via GraphQL',
                    error: error.message,
                    email,
                    ip: context.req?.ip,
                });
                if (error.message.includes('already exists')) {
                    throw new graphql_1.GraphQLError('User with this email or username already exists', {
                        extensions: { code: 'USER_EXISTS' },
                    });
                }
                throw new graphql_1.GraphQLError('Registration failed', {
                    extensions: { code: 'REGISTRATION_FAILED' },
                });
            }
        },
        /**
         * Authenticate user and return tokens
         */
        login: async (_, { input }, context) => {
            const { email, password } = input;
            validateInput(auth_schema_js_1.loginSchema, input);
            const ip = context.req?.ip || 'unknown';
            const userAgent = context.req?.get?.('User-Agent') || '';
            try {
                const result = await authService.login(email.toLowerCase(), password, ip, userAgent);
                // Clear failed login attempts on success
                await (0, authRateLimit_js_1.clearFailedLogins)(ip, email.toLowerCase());
                logger_js_1.default.info({
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
            }
            catch (error) {
                // Record failed attempt
                await (0, authRateLimit_js_1.recordFailedLogin)(ip, email.toLowerCase());
                logger_js_1.default.warn({
                    message: 'Login failed via GraphQL',
                    email,
                    ip,
                    error: error.message,
                });
                throw new graphql_1.GraphQLError('Invalid credentials', {
                    extensions: { code: 'INVALID_CREDENTIALS' },
                });
            }
        },
        /**
         * Refresh access token using refresh token
         */
        refreshToken: async (_, { refreshToken }, context) => {
            try {
                const result = await authService.refreshAccessToken(refreshToken);
                if (!result) {
                    throw new graphql_1.GraphQLError('Invalid or expired refresh token', {
                        extensions: { code: 'INVALID_REFRESH_TOKEN' },
                    });
                }
                logger_js_1.default.info({
                    message: 'Token refreshed via GraphQL',
                    ip: context.req?.ip,
                });
                return {
                    success: true,
                    token: result.token,
                    refreshToken: result.refreshToken,
                };
            }
            catch (error) {
                logger_js_1.default.error({
                    message: 'Token refresh failed via GraphQL',
                    error: error.message,
                    ip: context.req?.ip,
                });
                throw new graphql_1.GraphQLError('Token refresh failed', {
                    extensions: { code: 'REFRESH_FAILED' },
                });
            }
        },
        /**
         * Logout user and invalidate tokens
         */
        logout: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                const token = context.req?.headers?.authorization?.replace('Bearer ', '');
                await authService.logout(context.user.id, token);
                logger_js_1.default.info({
                    message: 'User logged out via GraphQL',
                    userId: context.user.id,
                    ip: context.req?.ip,
                });
                return {
                    success: true,
                    message: 'Logout successful',
                };
            }
            catch (error) {
                logger_js_1.default.error({
                    message: 'Logout failed via GraphQL',
                    error: error.message,
                    userId: context.user?.id,
                    ip: context.req?.ip,
                });
                throw new graphql_1.GraphQLError('Logout failed', {
                    extensions: { code: 'LOGOUT_FAILED' },
                });
            }
        },
        /**
         * Request password reset email
         */
        requestPasswordReset: async (_, { email }, context) => {
            validateInput(auth_schema_js_1.requestPasswordResetSchema, { email });
            try {
                await passwordResetService.requestPasswordReset(email.toLowerCase(), context.req?.ip, context.req?.get?.('User-Agent'));
                // Always return success to prevent email enumeration
                return {
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent',
                };
            }
            catch (error) {
                logger_js_1.default.error({
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
        resetPassword: async (_, { token, newPassword }, context) => {
            validateInput(auth_schema_js_1.resetPasswordSchema, { token, newPassword });
            try {
                await passwordResetService.resetPassword(token, newPassword);
                logger_js_1.default.info({
                    message: 'Password reset successful via GraphQL',
                    ip: context.req?.ip,
                });
                return {
                    success: true,
                    message: 'Password reset successful. Please log in with your new password.',
                };
            }
            catch (error) {
                logger_js_1.default.warn({
                    message: 'Password reset failed via GraphQL',
                    error: error.message,
                    ip: context.req?.ip,
                });
                if (error.message.includes('expired') || error.message.includes('invalid')) {
                    throw new graphql_1.GraphQLError('Invalid or expired reset token', {
                        extensions: { code: 'INVALID_RESET_TOKEN' },
                    });
                }
                throw new graphql_1.GraphQLError('Password reset failed', {
                    extensions: { code: 'RESET_FAILED' },
                });
            }
        },
        /**
         * Change password for authenticated user
         */
        changePassword: async (_, { currentPassword, newPassword, }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            validateInput(auth_schema_js_1.changePasswordSchema, { currentPassword, newPassword });
            try {
                await passwordResetService.changePassword(context.user.id, currentPassword, newPassword);
                logger_js_1.default.info({
                    message: 'Password changed via GraphQL',
                    userId: context.user.id,
                    ip: context.req?.ip,
                });
                return {
                    success: true,
                    message: 'Password changed successfully',
                };
            }
            catch (error) {
                logger_js_1.default.warn({
                    message: 'Password change failed via GraphQL',
                    error: error.message,
                    userId: context.user.id,
                    ip: context.req?.ip,
                });
                if (error.message.includes('incorrect')) {
                    throw new graphql_1.GraphQLError('Current password is incorrect', {
                        extensions: { code: 'INCORRECT_PASSWORD' },
                    });
                }
                throw new graphql_1.GraphQLError('Password change failed', {
                    extensions: { code: 'CHANGE_FAILED' },
                });
            }
        },
        /**
         * Revoke a specific token
         */
        revokeToken: async (_, { token }, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new graphql_1.GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            try {
                await authService.revokeToken(token);
                logger_js_1.default.info({
                    message: 'Token revoked via GraphQL',
                    userId: context.user.id,
                    ip: context.req?.ip,
                });
                return {
                    success: true,
                    message: 'Token revoked successfully',
                };
            }
            catch (error) {
                logger_js_1.default.error({
                    message: 'Token revocation failed via GraphQL',
                    error: error.message,
                    ip: context.req?.ip,
                });
                throw new graphql_1.GraphQLError('Token revocation failed', {
                    extensions: { code: 'REVOCATION_FAILED' },
                });
            }
        },
    },
};
exports.default = authResolvers;
