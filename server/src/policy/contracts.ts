// server/src/policy/contracts.ts
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodSchema = any; // z.ZodSchema - using any for zod 3.25+ compatibility

// --- Types ---

export type SchemaId = string;
export type ContractId = string;

export interface Contract {
    id: ContractId;
    tenantId: string;
    dataset: string;
    requirements: {
        pii?: boolean; // If true, requires PII tagging/encryption
        residency?: string[]; // Allowed regions (e.g. ['us-east', 'eu-west'])
        schemaId: SchemaId;
    };
    action: 'ALLOW' | 'BLOCK' | 'REDACT'; // Policy action on violation
}

// --- Schemas (Avro/JSON simulation) ---

// Simulated schema registry (id -> validator)
const SCHEMA_REGISTRY: Map<SchemaId, ZodSchema> = new Map();

// Default schemas
SCHEMA_REGISTRY.set('user-clickstream-v1', z.object({
    userId: z.string(),
    url: z.string().url(),
    timestamp: z.string().datetime(),
    ip: z.string().ip().optional(),
    userAgent: z.string().optional()
}));

SCHEMA_REGISTRY.set('transaction-v1', z.object({
    txId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.enum(['USD', 'EUR']),
    userId: z.string(),
    metadata: z.record(z.any()).optional()
}));

// --- Logic ---

export async function registerContract(contract: Contract) {
    const pool = getPostgresPool();
    await pool.query(
        `INSERT INTO data_contracts (id, tenant_id, dataset, requirements, action)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET requirements = $4, action = $5`,
        [contract.id, contract.tenantId, contract.dataset, contract.requirements, contract.action]
    );
    logger.info({ contractId: contract.id }, 'Contract registered/updated');
}

export function registerSchema(id: SchemaId, schema: ZodSchema) {
    SCHEMA_REGISTRY.set(id, schema);
}

export async function applyContract(schemaId: SchemaId, data: any, tenantId?: string): Promise<void> {
    // 1. Schema Validation
    const validator = SCHEMA_REGISTRY.get(schemaId);
    if (!validator) {
        throw new AppError(`Unknown schema ID: ${schemaId}`, 400);
    }

    const parseResult = validator.safeParse(data);
    if (!parseResult.success) {
        throw new AppError(`Schema validation failed for ${schemaId}: ${parseResult.error.message}`, 400);
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

async function fetchContracts(tenantId: string, schemaId: SchemaId): Promise<Contract[]> {
    const pool = getPostgresPool();
    // In a high-throughput path, this should be cached (Redis/Memory).
    // For MVP, direct DB query is okay if connection pool is healthy, but risky.
    // Optimization: Add simple in-memory LRU cache if needed.
    const result = await pool.query(
        `SELECT * FROM data_contracts
         WHERE tenant_id = $1 AND requirements->>'schemaId' = $2`,
        [tenantId, schemaId]
    );
    return result.rows.map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        dataset: row.dataset,
        requirements: row.requirements,
        action: row.action
    }));
}

function enforceSpecificContract(contract: Contract, data: any) {
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

function handleViolation(contract: Contract, reason: string) {
    logger.warn({ contractId: contract.id, action: contract.action, reason }, 'Contract violation detected');

    if (contract.action === 'BLOCK') {
        throw new AppError(`Contract Violation: ${reason}`, 403);
    }
    // REDACT would imply mutating data, not implemented in this pass
}
