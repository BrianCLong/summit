"use strict";
// @ts-nocheck
/**
 * Investigation DataLoader - Batch loading for investigations from PostgreSQL/Neo4j
 * Prevents N+1 query issues when fetching multiple investigations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvestigationLoader = createInvestigationLoader;
exports.createInvestigationsByUserLoader = createInvestigationsByUserLoader;
const dataloader_1 = __importDefault(require("dataloader"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
/**
 * Batch function for loading investigations by ID from PostgreSQL
 */
async function batchLoadInvestigations(ids, context) {
    const client = await context.pgPool.connect();
    try {
        const startTime = Date.now();
        // Single query to fetch all requested investigations
        const result = await client.query(`
      SELECT id, name, description, status, created_by, tenant_id, created_at, updated_at
      FROM investigations
      WHERE id = ANY($1::uuid[]) AND tenant_id = $2
      `, [ids, context.tenantId]);
        // Create a map of id -> investigation
        const investigationMap = new Map();
        result.rows.forEach((row) => {
            const investigation = {
                id: row.id,
                name: row.name,
                description: row.description,
                status: row.status,
                createdBy: row.created_by,
                tenantId: row.tenant_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
            investigationMap.set(investigation.id, investigation);
        });
        const duration = Date.now() - startTime;
        logger.debug({
            batchSize: ids.length,
            found: investigationMap.size,
            duration,
        }, 'Investigation batch load completed');
        // Return investigations in the same order as requested IDs
        return ids.map((id) => {
            const investigation = investigationMap.get(id);
            if (!investigation) {
                return new Error(`Investigation not found: ${id}`);
            }
            return investigation;
        });
    }
    catch (error) {
        logger.error({ error, ids }, 'Error in investigation batch loader');
        return ids.map(() => error);
    }
    finally {
        client.release();
    }
}
/**
 * Creates a new Investigation DataLoader
 */
function createInvestigationLoader(context) {
    return new dataloader_1.default((ids) => batchLoadInvestigations(ids, context), {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
    });
}
/**
 * DataLoader for fetching investigations by user ID
 */
function createInvestigationsByUserLoader(context) {
    return new dataloader_1.default(async (userIds) => {
        const client = await context.pgPool.connect();
        try {
            const result = await client.query(`
          SELECT id, name, description, status, created_by, tenant_id, created_at, updated_at
          FROM investigations
          WHERE created_by = ANY($1::uuid[]) AND tenant_id = $2
          ORDER BY created_at DESC
          `, [userIds, context.tenantId]);
            const investigationsByUser = new Map();
            result.rows.forEach((row) => {
                const investigation = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    status: row.status,
                    createdBy: row.created_by,
                    tenantId: row.tenant_id,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
                if (!investigationsByUser.has(investigation.createdBy)) {
                    investigationsByUser.set(investigation.createdBy, []);
                }
                investigationsByUser.get(investigation.createdBy).push(investigation);
            });
            return userIds.map((id) => investigationsByUser.get(id) || []);
        }
        finally {
            client.release();
        }
    }, {
        cache: true,
        maxBatchSize: 50,
    });
}
