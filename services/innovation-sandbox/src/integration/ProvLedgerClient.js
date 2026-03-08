"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvLedgerClient = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('ProvLedgerClient');
/**
 * Client for integrating with prov-ledger service for chain of custody tracking
 */
class ProvLedgerClient {
    baseUrl;
    signingKey;
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.PROV_LEDGER_URL || 'http://prov-ledger:3000';
        this.signingKey = process.env.PROV_SIGNING_KEY || 'dev-signing-key';
    }
    /**
     * Record sandbox creation in provenance ledger
     */
    async recordSandboxCreation(config) {
        const record = {
            id: this.generateRecordId(),
            type: 'sandbox_created',
            sandboxId: config.id,
            tenantId: config.tenantId,
            ownerId: config.ownerId,
            timestamp: new Date().toISOString(),
            signature: '',
            metadata: {
                isolationLevel: config.isolationLevel,
                dataClassification: config.dataClassification,
                quotas: config.quotas,
            },
        };
        record.signature = this.signRecord(record);
        return this.submitRecord(record);
    }
    /**
     * Record code execution in provenance ledger
     */
    async recordExecution(sandboxId, executionId, tenantId, ownerId, codeHash, inputHash, outputHash, sensitiveDataCount) {
        const record = {
            id: this.generateRecordId(),
            type: 'execution',
            sandboxId,
            tenantId,
            ownerId,
            timestamp: new Date().toISOString(),
            signature: '',
            metadata: {
                executionId,
                codeHash,
                inputHash,
                outputHash,
                sensitiveDataCount,
            },
        };
        record.signature = this.signRecord(record);
        return this.submitRecord(record);
    }
    /**
     * Record migration initiation
     */
    async recordMigrationStart(status, config, targetPlatform, targetEnvironment) {
        const record = {
            id: this.generateRecordId(),
            type: 'migration',
            sandboxId: config.id,
            tenantId: config.tenantId,
            ownerId: config.ownerId,
            timestamp: new Date().toISOString(),
            signature: '',
            metadata: {
                migrationId: status.migrationId,
                targetPlatform,
                targetEnvironment,
                phases: status.phases.map(p => p.name),
            },
        };
        record.signature = this.signRecord(record);
        return this.submitRecord(record);
    }
    /**
     * Record deployment completion with artifacts
     */
    async recordDeployment(status, config, artifacts) {
        const record = {
            id: this.generateRecordId(),
            type: 'deployment',
            sandboxId: config.id,
            tenantId: config.tenantId,
            ownerId: config.ownerId,
            timestamp: new Date().toISOString(),
            signature: '',
            metadata: {
                migrationId: status.migrationId,
                status: status.status,
                duration: status.completedAt
                    ? status.completedAt.getTime() - status.startedAt.getTime()
                    : null,
            },
            artifacts: artifacts.map(a => ({
                name: a.name,
                hash: a.hash,
                type: a.type,
            })),
        };
        record.signature = this.signRecord(record);
        return this.submitRecord(record);
    }
    /**
     * Verify provenance chain for a sandbox
     */
    async verifyChain(sandboxId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/chains/${sandboxId}/verify`);
            if (!response.ok) {
                logger.warn('Chain verification failed', { sandboxId, status: response.status });
                return { valid: false, records: 0, gaps: ['verification_failed'] };
            }
            return response.json();
        }
        catch (error) {
            logger.error('Chain verification error', { sandboxId, error });
            return { valid: false, records: 0, gaps: ['connection_error'] };
        }
    }
    /**
     * Get full provenance history for a sandbox
     */
    async getHistory(sandboxId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/chains/${sandboxId}/records`);
            if (!response.ok) {
                return [];
            }
            return response.json();
        }
        catch (error) {
            logger.error('Failed to fetch history', { sandboxId, error });
            return [];
        }
    }
    generateRecordId() {
        return `prov_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    signRecord(record) {
        const payload = JSON.stringify({
            id: record.id,
            type: record.type,
            sandboxId: record.sandboxId,
            timestamp: record.timestamp,
            metadata: record.metadata,
        });
        return (0, crypto_1.createHash)('sha256')
            .update(payload + this.signingKey)
            .digest('hex');
    }
    async submitRecord(record) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
            });
            if (!response.ok) {
                logger.warn('Failed to submit provenance record', {
                    id: record.id,
                    status: response.status,
                });
                // Don't fail the operation, just log
                return record.id;
            }
            const result = (await response.json());
            logger.debug('Provenance record submitted', { id: record.id });
            return result.id || record.id;
        }
        catch (error) {
            // Log but don't fail - provenance is important but not blocking
            logger.warn('Provenance submission error', { id: record.id, error });
            return record.id;
        }
    }
}
exports.ProvLedgerClient = ProvLedgerClient;
