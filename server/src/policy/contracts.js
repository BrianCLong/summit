"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContract = registerContract;
exports.registerSchema = registerSchema;
exports.applyContract = applyContract;
// server/src/policy/contracts.ts
const zod_1 = require("zod");
const errors_js_1 = require("../lib/errors.js");
const logger_js_1 = require("../config/logger.js");
const postgres_js_1 = require("../db/postgres.js");
// --- Schemas (Avro/JSON simulation) ---
// Simulated schema registry (id -> validator)
const SCHEMA_REGISTRY = new Map();
// Default schemas
SCHEMA_REGISTRY.set('user-clickstream-v1', zod_1.z.object({
    userId: zod_1.z.string(),
    url: zod_1.z.string().url(),
    timestamp: zod_1.z.string().datetime(),
    ip: zod_1.z.string().ip().optional(),
    userAgent: zod_1.z.string().optional()
}));
SCHEMA_REGISTRY.set('transaction-v1', zod_1.z.object({
    txId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.enum(['USD', 'EUR']),
    userId: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
}));
// --- Logic ---
async function registerContract(contract) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query(`INSERT INTO data_contracts (id, tenant_id, dataset, requirements, action)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET requirements = $4, action = $5`, [contract.id, contract.tenantId, contract.dataset, contract.requirements, contract.action]);
    logger_js_1.logger.info({ contractId: contract.id }, 'Contract registered/updated');
}
function registerSchema(id, schema) {
    SCHEMA_REGISTRY.set(id, schema);
}
async function applyContract(schemaId, data, tenantId) {
    // 1. Schema Validation
    const validator = SCHEMA_REGISTRY.get(schemaId);
    if (!validator) {
        throw new errors_js_1.AppError(`Unknown schema ID: ${schemaId}`, 400);
    }
    const parseResult = validator.safeParse(data);
    if (!parseResult.success) {
        throw new errors_js_1.AppError(`Schema validation failed for ${schemaId}: ${parseResult.error.message}`, 400);
    }
    // 2. Contract Enforcement
    // Derived tenant from data if not passed
    const tid = tenantId || data.tenantId;
    if (tid) {
        const contracts = await fetchContracts(tid, schemaId);
        for (const contract of contracts) {
            enforceSpecificContract(contract, data);
        }
    }
}
async function fetchContracts(tenantId, schemaId) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    // In a high-throughput path, this should be cached (Redis/Memory).
    // For MVP, direct DB query is okay if connection pool is healthy, but risky.
    // Optimization: Add simple in-memory LRU cache if needed.
    const result = await pool.query(`SELECT * FROM data_contracts
         WHERE tenant_id = $1 AND requirements->>'schemaId' = $2`, [tenantId, schemaId]);
    return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        dataset: row.dataset,
        requirements: row.requirements,
        action: row.action
    }));
}
function enforceSpecificContract(contract, data) {
    // PII Check
    if (contract.requirements.pii === false) {
        // Contract explicitly forbids PII, check for PII patterns
        // Simple heuristic check
        const piiPatterns = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
            /\b\d{3}-\d{2}-\d{4}\b/ // SSN
        ];
        const jsonStr = JSON.stringify(data);
        const hasPii = piiPatterns.some(p => p.test(jsonStr));
        if (hasPii) {
            handleViolation(contract, 'PII detected in non-PII dataset');
        }
    }
    // Residency Check
    if (contract.requirements.residency && contract.requirements.residency.length > 0) {
        const currentRegion = process.env.REGION || 'us-east';
        if (!contract.requirements.residency.includes(currentRegion)) {
            handleViolation(contract, `Data residency violation: ${currentRegion} not in [${contract.requirements.residency.join(',')}]`);
        }
    }
}
function handleViolation(contract, reason) {
    logger_js_1.logger.warn({ contractId: contract.id, action: contract.action, reason }, 'Contract violation detected');
    if (contract.action === 'BLOCK') {
        throw new errors_js_1.AppError(`Contract Violation: ${reason}`, 403);
    }
    // REDACT would imply mutating data, not implemented in this pass
}
