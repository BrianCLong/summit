/**
 * User DataLoader - Batch loading for users from PostgreSQL
 * Prevents N+1 query issues when fetching multiple users
 */

import DataLoader from 'dataloader';
import pino from 'pino';
import type { DataLoaderContext } from './index.js';

const logger = pino();

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Batch function for loading users by ID from PostgreSQL
 */
async function batchLoadUsers(
  ids: readonly string[],
  context: DataLoaderContext
): Promise<(User | Error)[]> {
  const client = await context.pgPool.connect();

  try {
    const startTime = Date.now();

    // Single query to fetch all requested users
    const result = await client.query(
      `
      SELECT id, email, name, role, tenant_id, created_at, updated_at
      FROM users
      WHERE id = ANY($1::uuid[]) AND tenant_id = $2
      `,
      [ids as string[], context.tenantId]
    );

    // Create a map of id -> user
    const userMap = new Map<string, User>();
    result.rows.forEach((row) => {
      const user: User = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      userMap.set(user.id, user);
    });

    const duration = Date.now() - startTime;
    logger.debug(
      {
        batchSize: ids.length,
        found: userMap.size,
        duration,
      },
      'User batch load completed'
    );

    // Return users in the same order as requested IDs
    return ids.map((id) => {
      const user = userMap.get(id);
      if (!user) {
        return new Error(`User not found: ${id}`);
      }
      return user;
    });
  } catch (error) {
    logger.error({ error, ids }, 'Error in user batch loader');
    return ids.map(() => error as Error);
  } finally {
    client.release();
  }
}

/**
 * Creates a new User DataLoader
 */
export function createUserLoader(
  context: DataLoaderContext
): DataLoader<string, User, string> {
  return new DataLoader(
    (ids) => batchLoadUsers(ids, context),
    {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    }
  );
}

/**
 * DataLoader for fetching users by email
 */
export function createUserByEmailLoader(
  context: DataLoaderContext
): DataLoader<string, User, string> {
  return new DataLoader(
    async (emails: readonly string[]) => {
      const client = await context.pgPool.connect();

      try {
        const result = await client.query(
          `
          SELECT id, email, name, role, tenant_id, created_at, updated_at
          FROM users
          WHERE email = ANY($1::text[]) AND tenant_id = $2
          `,
          [emails as string[], context.tenantId]
        );

        const userMap = new Map<string, User>();
        result.rows.forEach((row) => {
          const user: User = {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            tenantId: row.tenant_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
          userMap.set(user.email, user);
        });

        return emails.map((email) => {
          const user = userMap.get(email);
          if (!user) {
            return new Error(`User not found: ${email}`);
          }
          return user;
        });
      } finally {
        client.release();
      }
    },
    {
      cache: true,
      maxBatchSize: 100,
    }
  );
}
