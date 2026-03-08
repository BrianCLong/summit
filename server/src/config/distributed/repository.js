"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryConfigRepository = void 0;
class InMemoryConfigRepository {
    clock;
    histories = new Map();
    constructor(clock = () => new Date()) {
        this.clock = clock;
    }
    ensureHistory(configId) {
        const history = this.histories.get(configId);
        if (history) {
            return history;
        }
        const created = {
            versions: [],
            audit: [],
            applied: new Map(),
        };
        this.histories.set(configId, created);
        return created;
    }
    async saveVersion(configId, version, auditEntry) {
        const history = this.ensureHistory(configId);
        history.versions.push(version);
        history.audit.push(auditEntry);
    }
    async getLatestVersion(configId) {
        const history = this.histories.get(configId);
        if (!history || history.versions.length === 0) {
            return undefined;
        }
        return history.versions[history.versions.length - 1];
    }
    async getVersion(configId, versionNumber) {
        const history = this.histories.get(configId);
        return history?.versions.find((entry) => entry.metadata.version === versionNumber);
    }
    async listVersions(configId) {
        const history = this.histories.get(configId);
        return history ? [...history.versions] : [];
    }
    async recordAppliedState(configId, state) {
        const history = this.ensureHistory(configId);
        history.applied.set(state.environment, {
            ...state,
            appliedAt: state.appliedAt ?? this.clock(),
        });
    }
    async getAppliedState(configId, environment) {
        const history = this.histories.get(configId);
        return history?.applied.get(environment);
    }
    async getAuditTrail(configId) {
        const history = this.histories.get(configId);
        return history ? [...history.audit] : [];
    }
}
exports.InMemoryConfigRepository = InMemoryConfigRepository;
exports.default = InMemoryConfigRepository;
