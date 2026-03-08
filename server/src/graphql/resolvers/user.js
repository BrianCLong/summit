"use strict";
/**
 * User GraphQL Resolvers
 *
 * Provides GraphQL queries and mutations for user management:
 * - Fetch individual users by ID
 * - List users with pagination
 * - Create, update, delete users
 * - Update user preferences
 *
 * All operations use real PostgreSQL database queries with caching.
 *
 * @module graphql/resolvers/user
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const pino_1 = __importDefault(require("pino"));
const businessMetrics_js_1 = require("../../monitoring/businessMetrics.js");
const index_js_1 = require("../../lib/cache/index.js");
const config_js_1 = require("../../config.js");
const database_js_1 = require("../../config/database.js");
const argon2_1 = __importDefault(require("argon2"));
const crypto_1 = require("crypto");
const auth_js_1 = require("../utils/auth.js");
const logger = pino_1.default();
/**
 * Transform database user to GraphQL user format
 */
function formatUser(dbUser) {
    return {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        fullName: dbUser.first_name && dbUser.last_name
            ? `${dbUser.first_name} ${dbUser.last_name}`
            : undefined,
        role: dbUser.role,
        isActive: dbUser.is_active,
        lastLogin: dbUser.last_login,
        preferences: dbUser.preferences,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
    };
}
const userResolvers = {
    Query: {
        /**
         * Fetch a single user by ID
         */
        user: (0, auth_js_1.authGuard)(async (_, { id }, context) => {
            const cacheKey = `user:${id}`;
            try {
                // Check cache first
                const cachedUser = await index_js_1.cache.get(cacheKey);
                if (cachedUser) {
                    logger.info({ userId: id }, '[CACHE HIT] Found user in cache');
                    return cachedUser;
                }
                logger.info({ userId: id }, '[CACHE MISS] Fetching user from database');
                const pool = (0, database_js_1.getPostgresPool)();
                const result = await pool.query(`SELECT id, email, username, first_name, last_name, role, is_active,
                  last_login, preferences, created_at, updated_at
           FROM users
           WHERE id = $1`, [id]);
                if (result.rows.length === 0) {
                    return null;
                }
                const user = formatUser(result.rows[0]);
                // Cache for configured TTL
                await index_js_1.cache.set(cacheKey, user, config_js_1.cfg.CACHE_TTL_DEFAULT);
                return user;
            }
            catch (error) {
                logger.error({ userId: id, error }, 'Failed to fetch user');
                throw new graphql_1.GraphQLError('Failed to fetch user', {
                    extensions: { code: 'USER_FETCH_FAILED' },
                });
            }
        }),
        /**
         * List users with pagination
         */
        users: (0, auth_js_1.authGuard)(async (_, { limit = 25, offset = 0 }, context // Correctly typed
        ) => {
            try {
                // Permission check is handled by authGuard if we pass 'admin' or handled inside.
                // The original code was: context.user.role !== 'ADMIN' check.
                // Let's rely on authGuard with permission 'read:users' or just enforce ADMIN check inside if RBAC isn't fully set up yet.
                // For now, I'll keep the internal check but ensure authGuard is present.
                if (context.user && !context.user.roles.includes('ADMIN')) {
                    throw new graphql_1.GraphQLError('Only administrators can list all users', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                const pool = (0, database_js_1.getPostgresPool)();
                const result = await pool.query(`SELECT id, email, username, first_name, last_name, role, is_active,
                  last_login, preferences, created_at, updated_at
           FROM users
           WHERE is_active = true
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`, [Math.min(limit, 100), offset] // Cap at 100 to prevent excessive queries
                );
                logger.info({ limit, offset, count: result.rows.length }, 'Fetched users list');
                return result.rows.map((row) => formatUser(row));
            }
            catch (error) {
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                logger.error({ limit, offset, error }, 'Failed to fetch users list');
                throw new graphql_1.GraphQLError('Failed to fetch users', {
                    extensions: { code: 'USERS_FETCH_FAILED' },
                });
            }
        }),
    },
    Mutation: {
        /**
         * Create a new user (admin only)
         */
        createUser: (0, auth_js_1.authGuard)(async (_, { input }, context // Correctly typed
        ) => {
            try {
                if (!context.user.roles.includes('ADMIN')) { // context.user guaranteed by authGuard
                    throw new graphql_1.GraphQLError('Only administrators can create users', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                const pool = (0, database_js_1.getPostgresPool)();
                // Check if user already exists
                const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [input.email.toLowerCase(), input.username]);
                if (existingUser.rows.length > 0) {
                    throw new graphql_1.GraphQLError('User with this email or username already exists', {
                        extensions: { code: 'USER_EXISTS' },
                    });
                }
                // Generate a temporary password
                const tempPassword = (0, crypto_1.randomBytes)(16).toString('hex');
                const passwordHash = await argon2_1.default.hash(tempPassword);
                const result = await pool.query(`INSERT INTO users (email, username, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id, email, username, first_name, last_name, role, is_active, created_at`, [
                    input.email.toLowerCase(),
                    input.username || input.email.split('@')[0],
                    passwordHash,
                    'VIEWER', // Default role
                ]);
                const user = formatUser(result.rows[0]);
                // Record signup metric
                (0, businessMetrics_js_1.recordUserSignup)({
                    tenant: 'global',
                    plan: 'standard',
                    metadata: { email: input.email },
                });
                logger.info({ userId: user.id, email: user.email }, 'User created via GraphQL');
                return user;
            }
            catch (error) {
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                logger.error({ input, error }, 'Failed to create user');
                throw new graphql_1.GraphQLError('Failed to create user', {
                    extensions: { code: 'USER_CREATE_FAILED' },
                });
            }
        }),
        /**
         * Update an existing user
         */
        updateUser: (0, auth_js_1.authGuard)(async (_, { id, input, }, context // Correctly typed
        ) => {
            try {
                // Users can only update themselves unless admin
                if (context.user.id !== id && !context.user.roles.includes('ADMIN')) {
                    throw new graphql_1.GraphQLError('You can only update your own profile', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                const pool = (0, database_js_1.getPostgresPool)();
                // Check if user exists
                const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
                if (existingUser.rows.length === 0) {
                    throw new graphql_1.GraphQLError('User not found', {
                        extensions: { code: 'USER_NOT_FOUND' },
                    });
                }
                // Build update query dynamically
                const updates = [];
                const values = [];
                let paramIndex = 1;
                if (input.email) {
                    updates.push(`email = $${paramIndex++}`);
                    values.push(input.email.toLowerCase());
                }
                if (input.username) {
                    updates.push(`username = $${paramIndex++}`);
                    values.push(input.username);
                }
                updates.push(`updated_at = NOW()`);
                values.push(id);
                const result = await pool.query(`UPDATE users
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING id, email, username, first_name, last_name, role, is_active, created_at, updated_at`, values);
                const user = formatUser(result.rows[0]);
                // Invalidate cache
                await index_js_1.cache.invalidate(`user:${id}`);
                logger.info({ userId: id }, 'User updated via GraphQL');
                return user;
            }
            catch (error) {
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                logger.error({ userId: id, input, error }, 'Failed to update user');
                throw new graphql_1.GraphQLError('Failed to update user', {
                    extensions: { code: 'USER_UPDATE_FAILED' },
                });
            }
        }),
        /**
         * Delete a user (soft delete)
         */
        deleteUser: (0, auth_js_1.authGuard)(async (_, { id }, context) => {
            try {
                // Check admin permission
                if (!context.user.roles.includes('ADMIN')) {
                    throw new graphql_1.GraphQLError('Only administrators can delete users', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                // Prevent self-deletion
                if (context.user.id === id) {
                    throw new graphql_1.GraphQLError('You cannot delete your own account', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                const pool = (0, database_js_1.getPostgresPool)();
                // Soft delete: set is_active to false
                const result = await pool.query(`UPDATE users
           SET is_active = false, updated_at = NOW()
           WHERE id = $1
           RETURNING id`, [id]);
                if (result.rows.length === 0) {
                    throw new graphql_1.GraphQLError('User not found', {
                        extensions: { code: 'USER_NOT_FOUND' },
                    });
                }
                // Invalidate cache
                await index_js_1.cache.invalidate(`user:${id}`);
                // Revoke all sessions for the user
                await pool.query('UPDATE user_sessions SET is_revoked = true WHERE user_id = $1', [id]);
                logger.info({ userId: id }, 'User deleted (soft) via GraphQL');
                return true;
            }
            catch (error) {
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                logger.error({ userId: id, error }, 'Failed to delete user');
                throw new graphql_1.GraphQLError('Failed to delete user', {
                    extensions: { code: 'USER_DELETE_FAILED' },
                });
            }
        }),
        /**
         * Update user preferences (JSON merge)
         */
        updateUserPreferences: (0, auth_js_1.authGuard)(async (_, { userId, preferences, }, context) => {
            try {
                // Users can only update their own preferences unless admin
                if (context.user.id !== userId &&
                    !context.user.roles.includes('ADMIN')) {
                    throw new graphql_1.GraphQLError('You can only update your own preferences', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }
                const pool = (0, database_js_1.getPostgresPool)();
                // Merge preferences with existing ones using JSONB concat
                const result = await pool.query(`UPDATE users
           SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, email, username, first_name, last_name, role, is_active, preferences, created_at, updated_at`, [JSON.stringify(preferences), userId]);
                if (result.rows.length === 0) {
                    throw new graphql_1.GraphQLError('User not found', {
                        extensions: { code: 'USER_NOT_FOUND' },
                    });
                }
                const user = formatUser(result.rows[0]);
                // Invalidate cache
                await index_js_1.cache.invalidate(`user:${userId}`);
                logger.info({ userId }, 'User preferences updated via GraphQL');
                return user;
            }
            catch (error) {
                if (error instanceof graphql_1.GraphQLError) {
                    throw error;
                }
                logger.error({ userId, preferences, error }, 'Failed to update user preferences');
                throw new graphql_1.GraphQLError('Failed to update user preferences', {
                    extensions: { code: 'PREFERENCES_UPDATE_FAILED' },
                });
            }
        }),
    },
};
exports.default = userResolvers;
