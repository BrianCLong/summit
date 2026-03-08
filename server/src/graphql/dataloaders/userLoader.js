"use strict";
// @ts-nocheck
/**
 * User DataLoader - Batch loading for users from PostgreSQL
 * Prevents N+1 query issues when fetching multiple users
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserLoader = createUserLoader;
exports.createUserByEmailLoader = createUserByEmailLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
/**
 * Batch function for loading users by ID from PostgreSQL
 */
async function batchLoadUsers(ids, context) {
    const client = context.pgClient || await context.pgPool.connect();
    const shouldRelease = !context.pgClient;
    try {
        const startTime = Date.now();
        // Single query to fetch all requested users
        const result = await client.query(`
      SELECT id, email, name, role, tenant_id, created_at, updated_at
      FROM users
      WHERE id = ANY($1::uuid[]) AND tenant_id = $2
      `, [ids, context.tenantId]);
        // Create a map of id -> user
        const userMap = new Map();
        result.rows.forEach((row) => {
            const user = {
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
        logger.debug({
            batchSize: ids.length,
            found: userMap.size,
            duration,
        }, 'User batch load completed');
        // Return users in the same order as requested IDs
        return ids.map((id) => {
            const user = userMap.get(id);
            if (!user) {
                return new Error(`User not found: ${id}`);
            }
            return user;
        });
    }
    catch (error) {
        logger.error({ error, ids }, 'Error in user batch loader');
        return ids.map(() => error);
    }
    finally {
        if (shouldRelease) {
            client.release();
        }
    }
}
/**
 * Creates a new User DataLoader
 */
function createUserLoader(context) {
    return new dataloader_1.default((ids) => batchLoadUsers(ids, context), {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * DataLoader for fetching users by email
 */
function createUserByEmailLoader(context) {
    return new dataloader_1.default(async (emails) => {
        const client = context.pgClient || await context.pgPool.connect();
        const shouldRelease = !context.pgClient;
        try {
            const result = await client.query(`
          SELECT id, email, name, role, tenant_id, created_at, updated_at
          FROM users
          WHERE email = ANY($1::text[]) AND tenant_id = $2
          `, [emails, context.tenantId]);
            const userMap = new Map();
            result.rows.forEach((row) => {
                const user = {
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
        }
        finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }, {
        cache: true,
        maxBatchSize: 100,
    });
}
