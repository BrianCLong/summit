"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorRuntime = void 0;
const observability_1 = require("./observability");
const secretVault_1 = require("./secretVault");
class ConnectorRuntime {
    connectors = new Map();
    observability;
    secretVault;
    migrationTargets = new Set();
    constructor(observability = new observability_1.ConnectorObservability(), vault = new secretVault_1.SecretVault()) {
        this.observability = observability;
        this.secretVault = vault;
    }
    registerConnector(metadata, adapter, options) {
        this.connectors.set(metadata.id, {
            metadata,
            adapter,
            health: 'degraded',
            sandboxMode: options.sandboxMode ?? 'live',
            retries: options.retryPolicy.attempts
        });
    }
    addSecret(connectorId, key, value) {
        return this.secretVault.setSecret(connectorId, key, value);
    }
    rotateSecret(connectorId, key, value) {
        return this.secretVault.rotateSecret(connectorId, key, value);
    }
    async execute(connectorId, payload) {
        const state = this.connectors.get(connectorId);
        if (!state) {
            throw new Error(`Connector ${connectorId} not found`);
        }
        const start = Date.now();
        const policy = { attempts: state.retries, backoffMs: 200 };
        let attempt = 0;
        while (attempt < policy.attempts) {
            attempt += 1;
            try {
                const result = await this.runAdapter(state, payload);
                if (result.success) {
                    this.observability.recordSuccess(connectorId, Date.now() - start);
                    state.health = 'connected';
                    state.lastRun = Date.now();
                    return result;
                }
                throw result.error ?? new Error('Unknown connector failure');
            }
            catch (error) {
                this.observability.recordFailure(connectorId);
                if (attempt >= policy.attempts) {
                    state.health = 'failing';
                    return { success: false, error: error };
                }
                await new Promise((resolve) => setTimeout(resolve, policy.backoffMs * attempt));
            }
        }
        state.health = 'failing';
        return { success: false, error: new Error('Exhausted attempts') };
    }
    async runAdapter(state, payload) {
        const adapter = state.adapter;
        if (state.sandboxMode === 'sandbox' && state.metadata.sandboxFixtures) {
            return { success: true, data: state.metadata.sandboxFixtures };
        }
        if (adapter.pull && (state.metadata.kind === 'pull' || state.metadata.kind === 'file-based')) {
            return adapter.pull(payload);
        }
        if (adapter.push && (state.metadata.kind === 'push' || state.metadata.kind === 'event-driven')) {
            return adapter.push(payload ?? {});
        }
        if (adapter.onEvent && state.metadata.kind === 'event-driven') {
            return adapter.onEvent(payload ?? {});
        }
        throw new Error(`No adapter method available for kind ${state.metadata.kind}`);
    }
    pause(connectorId) {
        const state = this.connectors.get(connectorId);
        if (!state)
            throw new Error(`Connector ${connectorId} not found`);
        state.health = 'paused';
        this.observability.pause(connectorId);
    }
    health(connectorId) {
        return this.connectors.get(connectorId)?.health ?? 'failing';
    }
    listInventory() {
        return [...this.connectors.values()].map(({ metadata, health }) => ({ metadata, health }));
    }
    migrateOneOff(connectorId) {
        const state = this.connectors.get(connectorId);
        if (!state)
            throw new Error(`Connector ${connectorId} not found`);
        state.deprecated = true;
        this.migrationTargets.add(connectorId);
    }
    migrationDebtScore() {
        const total = this.connectors.size;
        const deprecated = [...this.connectors.values()].filter((state) => state.deprecated).length;
        return total === 0 ? 0 : 1 - deprecated / total;
    }
    auditedSecrets() {
        return this.secretVault.audit();
    }
    ensureFrameworkCompliance(metadata) {
        const supportedKinds = ['pull', 'push', 'event-driven', 'file-based', 'human-in-the-loop'];
        if (!supportedKinds.includes(metadata.kind)) {
            throw new Error(`Unsupported integration kind ${metadata.kind}`);
        }
        if (!metadata.contract.idempotency.idempotencyKeyHeader) {
            throw new Error('Missing idempotency contract');
        }
    }
    async testConnection(connectorId) {
        const state = this.connectors.get(connectorId);
        if (!state)
            throw new Error(`Connector ${connectorId} not found`);
        return state.adapter.testConnection();
    }
    audit() {
        return this.listInventory().map(({ metadata, health }) => ({
            connectorId: metadata.id,
            health,
            owner: metadata.owner,
            contractVersion: metadata.contract.versioning.current,
            lastRun: this.connectors.get(metadata.id)?.lastRun
        }));
    }
}
exports.ConnectorRuntime = ConnectorRuntime;
