import { MVP0AuthService } from '../../services/MVP0AuthService';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import config from '../../config';
const authService = new MVP0AuthService();
const mvp0AuthResolvers = {
    Query: {
        me: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Not authenticated');
            }
            // Get fresh user data with full profile
            const user = await authService.getUserById(context.user.id);
            if (!user) {
                throw new AuthenticationError('User not found');
            }
            return {
                id: user.id,
                email: user.email,
                role: user.role.toUpperCase(), // Convert to GraphQL enum format
                username: user.email, // Use email as username for now
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        },
        // MVP-0 specific auth queries
        refreshToken: async (_, { refreshToken }, context) => {
            if (!refreshToken) {
                throw new UserInputError('Refresh token required');
            }
            try {
                const result = await authService.refreshTokens(refreshToken, context.req?.ip, context.req?.get('User-Agent'));
                return {
                    token: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        role: result.user.role.toUpperCase(),
                        username: result.user.email,
                        firstName: result.user.firstName || '',
                        lastName: result.user.lastName || '',
                        isActive: result.user.isActive,
                        lastLogin: result.user.lastLogin,
                        createdAt: result.user.createdAt,
                        updatedAt: result.user.updatedAt
                    },
                    expiresIn: config.jwt.accessExpiresIn
                };
            }
            catch (error) {
                throw new AuthenticationError(error.message || 'Failed to refresh token');
            }
        }
    },
    Mutation: {
        login: async (_, { input }, context) => {
            const { email, password } = input;
            const ipAddress = context.req?.ip || '';
            const userAgent = context.req?.get('User-Agent') || '';
            try {
                const result = await authService.login(email, password, ipAddress, userAgent);
                return {
                    token: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        role: result.user.role.toUpperCase(),
                        username: result.user.email,
                        firstName: result.user.firstName || '',
                        lastName: result.user.lastName || '',
                        isActive: result.user.isActive,
                        lastLogin: result.user.lastLogin,
                        createdAt: result.user.createdAt,
                        updatedAt: result.user.updatedAt
                    },
                    expiresIn: config.jwt.accessExpiresIn
                };
            }
            catch (error) {
                throw new AuthenticationError(error.message || 'Login failed');
            }
        },
        register: async (_, { input }, context) => {
            // For MVP-0, enforce tenant enforcement if flag is enabled
            if (config.features.TENANT_ENFORCE && !input.tenantId) {
                throw new UserInputError('Tenant ID required when tenant enforcement is enabled');
            }
            try {
                const registrationData = {
                    email: input.email,
                    password: input.password,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    role: input.role || 'viewer',
                    tenantId: input.tenantId || 'default'
                };
                const result = await authService.register(registrationData);
                return {
                    token: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        role: result.user.role.toUpperCase(),
                        username: result.user.email,
                        firstName: result.user.firstName || '',
                        lastName: result.user.lastName || '',
                        isActive: result.user.isActive,
                        lastLogin: null,
                        createdAt: result.user.createdAt,
                        updatedAt: result.user.updatedAt
                    },
                    expiresIn: config.jwt.accessExpiresIn
                };
            }
            catch (error) {
                throw new UserInputError(error.message || 'Registration failed');
            }
        },
        logout: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                return true; // Already logged out
            }
            try {
                const authHeader = context.req?.headers?.authorization;
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    await authService.logout(context.user.id, token);
                }
                return true;
            }
            catch (error) {
                console.error('Logout error:', error);
                return false;
            }
        },
        // MVP-0 specific: Revoke all sessions for security
        logoutAllDevices: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new AuthenticationError('Not authenticated');
            }
            try {
                await authService.revokeAllUserTokens(context.user.id);
                return true;
            }
            catch (error) {
                console.error('Logout all devices error:', error);
                return false;
            }
        }
    },
    // Field resolvers
    User: {
        fullName: (user) => {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            return `${firstName} ${lastName}`.trim() || user.email;
        }
    }
};
export default mvp0AuthResolvers;
//# sourceMappingURL=mvp0-auth.js.map