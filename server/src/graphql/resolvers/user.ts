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

import { GraphQLError } from 'graphql';
import pino from 'pino';
import { recordUserSignup } from '../../monitoring/businessMetrics.js';
import { cache } from '../../lib/cache/index.js';
import { cfg } from '../../config.js';
import { getPostgresPool } from '../../config/database.js';
import argon2 from 'argon2';

const logger = pino();

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

interface DatabaseUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  preferences?: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Transform database user to GraphQL user format
 */
function formatUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    fullName:
      dbUser.first_name && dbUser.last_name
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
    user: async (_: any, { id }: { id: string }, context: any) => {
      const cacheKey = `user:${id}`;

      try {
        // Check cache first
        const cachedUser = await cache.get(cacheKey);
        if (cachedUser) {
          logger.info({ userId: id }, '[CACHE HIT] Found user in cache');
          return cachedUser;
        }

        logger.info({ userId: id }, '[CACHE MISS] Fetching user from database');

        const pool = getPostgresPool();
        const result = await pool.query(
          `SELECT id, email, username, first_name, last_name, role, is_active,
                  last_login, preferences, created_at, updated_at
           FROM users
           WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const user = formatUser(result.rows[0] as DatabaseUser);

        // Cache for configured TTL
        await cache.set(cacheKey, user, cfg.CACHE_TTL_DEFAULT);

        return user;
      } catch (error) {
        logger.error({ userId: id, error }, 'Failed to fetch user');
        throw new GraphQLError('Failed to fetch user', {
          extensions: { code: 'USER_FETCH_FAILED' },
        });
      }
    },

    /**
     * List users with pagination
     */
    users: async (
      _: any,
      { limit = 25, offset = 0 }: { limit: number; offset: number },
      context: any
    ) => {
      try {
        // Check if user has permission to list users
        if (context.user && context.user.role !== 'ADMIN') {
          throw new GraphQLError('Only administrators can list all users', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const pool = getPostgresPool();
        const result = await pool.query(
          `SELECT id, email, username, first_name, last_name, role, is_active,
                  last_login, preferences, created_at, updated_at
           FROM users
           WHERE is_active = true
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [Math.min(limit, 100), offset] // Cap at 100 to prevent excessive queries
        );

        logger.info(
          { limit, offset, count: result.rows.length },
          'Fetched users list'
        );

        return result.rows.map((row) => formatUser(row as DatabaseUser));
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error({ limit, offset, error }, 'Failed to fetch users list');
        throw new GraphQLError('Failed to fetch users', {
          extensions: { code: 'USERS_FETCH_FAILED' },
        });
      }
    },
  },

  Mutation: {
    /**
     * Create a new user (admin only)
     */
    createUser: async (
      _: any,
      { input }: { input: { email: string; username?: string } },
      context: any
    ) => {
      try {
        // Check admin permission
        if (context.user && context.user.role !== 'ADMIN') {
          throw new GraphQLError('Only administrators can create users', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const pool = getPostgresPool();

        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [input.email.toLowerCase(), input.username]
        );

        if (existingUser.rows.length > 0) {
          throw new GraphQLError('User with this email or username already exists', {
            extensions: { code: 'USER_EXISTS' },
          });
        }

        // Generate a temporary password
        const tempPassword = require('crypto').randomBytes(16).toString('hex');
        const passwordHash = await argon2.hash(tempPassword);

        const result = await pool.query(
          `INSERT INTO users (email, username, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id, email, username, first_name, last_name, role, is_active, created_at`,
          [
            input.email.toLowerCase(),
            input.username || input.email.split('@')[0],
            passwordHash,
            'VIEWER', // Default role
          ]
        );

        const user = formatUser(result.rows[0] as DatabaseUser);

        // Record signup metric
        recordUserSignup({
          tenant: 'global',
          plan: 'standard',
          metadata: { email: input.email },
        });

        logger.info(
          { userId: user.id, email: user.email },
          'User created via GraphQL'
        );

        return user;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error({ input, error }, 'Failed to create user');
        throw new GraphQLError('Failed to create user', {
          extensions: { code: 'USER_CREATE_FAILED' },
        });
      }
    },

    /**
     * Update an existing user
     */
    updateUser: async (
      _: any,
      {
        id,
        input,
      }: { id: string; input: { email?: string; username?: string } },
      context: any
    ) => {
      try {
        // Users can only update themselves unless admin
        if (context.user && context.user.id !== id && context.user.role !== 'ADMIN') {
          throw new GraphQLError('You can only update your own profile', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const pool = getPostgresPool();

        // Check if user exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE id = $1',
          [id]
        );

        if (existingUser.rows.length === 0) {
          throw new GraphQLError('User not found', {
            extensions: { code: 'USER_NOT_FOUND' },
          });
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
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

        const result = await pool.query(
          `UPDATE users
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING id, email, username, first_name, last_name, role, is_active, created_at, updated_at`,
          values
        );

        const user = formatUser(result.rows[0] as DatabaseUser);

        // Invalidate cache
        await cache.invalidate(`user:${id}`);

        logger.info({ userId: id }, 'User updated via GraphQL');

        return user;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error({ userId: id, input, error }, 'Failed to update user');
        throw new GraphQLError('Failed to update user', {
          extensions: { code: 'USER_UPDATE_FAILED' },
        });
      }
    },

    /**
     * Delete a user (soft delete)
     */
    deleteUser: async (_: any, { id }: { id: string }, context: any) => {
      try {
        // Check admin permission
        if (context.user && context.user.role !== 'ADMIN') {
          throw new GraphQLError('Only administrators can delete users', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        // Prevent self-deletion
        if (context.user && context.user.id === id) {
          throw new GraphQLError('You cannot delete your own account', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const pool = getPostgresPool();

        // Soft delete: set is_active to false
        const result = await pool.query(
          `UPDATE users
           SET is_active = false, updated_at = NOW()
           WHERE id = $1
           RETURNING id`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new GraphQLError('User not found', {
            extensions: { code: 'USER_NOT_FOUND' },
          });
        }

        // Invalidate cache
        await cache.invalidate(`user:${id}`);

        // Revoke all sessions for the user
        await pool.query(
          'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1',
          [id]
        );

        logger.info({ userId: id }, 'User deleted (soft) via GraphQL');

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error({ userId: id, error }, 'Failed to delete user');
        throw new GraphQLError('Failed to delete user', {
          extensions: { code: 'USER_DELETE_FAILED' },
        });
      }
    },

    /**
     * Update user preferences (JSON merge)
     */
    updateUserPreferences: async (
      _: any,
      {
        userId,
        preferences,
      }: { userId: string; preferences: Record<string, any> },
      context: any
    ) => {
      try {
        // Users can only update their own preferences unless admin
        if (
          context.user &&
          context.user.id !== userId &&
          context.user.role !== 'ADMIN'
        ) {
          throw new GraphQLError('You can only update your own preferences', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const pool = getPostgresPool();

        // Merge preferences with existing ones using JSONB concat
        const result = await pool.query(
          `UPDATE users
           SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, email, username, first_name, last_name, role, is_active, preferences, created_at, updated_at`,
          [JSON.stringify(preferences), userId]
        );

        if (result.rows.length === 0) {
          throw new GraphQLError('User not found', {
            extensions: { code: 'USER_NOT_FOUND' },
          });
        }

        const user = formatUser(result.rows[0] as DatabaseUser);

        // Invalidate cache
        await cache.invalidate(`user:${userId}`);

        logger.info({ userId }, 'User preferences updated via GraphQL');

        return user;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        logger.error(
          { userId, preferences, error },
          'Failed to update user preferences'
        );
        throw new GraphQLError('Failed to update user preferences', {
          extensions: { code: 'PREFERENCES_UPDATE_FAILED' },
        });
      }
    },
  },
};

export default userResolvers;
