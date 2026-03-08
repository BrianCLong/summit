"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
const monitoring_js_1 = require("./monitoring.js");
class ModelRegistry {
    models = new Map();
    deploy(request) {
        const record = this.models.get(request.modelId) || this.createRecord(request.modelId);
        const createdAt = new Date().toISOString();
        const versionState = {
            ...request,
            status: request.status || 'active',
            createdAt,
            metrics: new monitoring_js_1.MetricsCollector(),
            driftDetector: new monitoring_js_1.DriftDetector(),
        };
        record.versions.set(request.version, versionState);
        if (!record.activeVersion || request.status === 'active') {
            record.activeVersion = request.version;
        }
        if (request.status === 'shadow') {
            record.shadowVersion = request.version;
        }
        this.models.set(request.modelId, record);
        return versionState;
    }
    promote(modelId, version) {
        const record = this.models.get(modelId);
        if (!record)
            return undefined;
        const versionState = record.versions.get(version);
        if (!versionState)
            return undefined;
        record.activeVersion = version;
        this.models.set(modelId, record);
        return versionState;
    }
    retire(modelId, version) {
        const record = this.models.get(modelId);
        if (!record)
            return false;
        const versionState = record.versions.get(version);
        if (!versionState)
            return false;
        versionState.status = 'retired';
        if (record.activeVersion === version) {
            const candidates = Array.from(record.versions.values()).filter((candidate) => candidate.status !== 'retired');
            record.activeVersion = candidates[0]?.version || '';
        }
        return true;
    }
    selectVersion(modelId, requestedVersion, abTestId) {
        const record = this.models.get(modelId);
        if (!record)
            return undefined;
        if (requestedVersion && record.versions.has(requestedVersion)) {
            return record.versions.get(requestedVersion);
        }
        if (abTestId && record.abTests.has(abTestId)) {
            const test = record.abTests.get(abTestId);
            const selected = this.pickVariant(test);
            if (selected && record.versions.has(selected.version)) {
                return record.versions.get(selected.version);
            }
        }
        return record.versions.get(record.activeVersion);
    }
    createAbTest(modelId, test) {
        const record = this.models.get(modelId);
        if (!record)
            return undefined;
        const abTest = {
            ...test,
            id: `${modelId}-${Date.now()}`,
            startedAt: new Date().toISOString(),
        };
        record.abTests.set(abTest.id, abTest);
        this.models.set(modelId, record);
        return abTest;
    }
    listModels() {
        return Array.from(this.models.values()).flatMap((record) => Array.from(record.versions.values()).map((version) => ({
            modelId: record.modelId,
            version: version.version,
            status: version.status,
            config: version.config,
            runtime: version.runtime,
            optimization: version.optimization,
            metadata: version.metadata,
            createdAt: version.createdAt,
        })));
    }
    listVersions(modelId) {
        const record = this.models.get(modelId);
        if (!record)
            return [];
        return Array.from(record.versions.values()).map((version) => ({
            modelId: record.modelId,
            version: version.version,
            status: version.status,
            config: version.config,
            runtime: version.runtime,
            optimization: version.optimization,
            metadata: version.metadata,
            createdAt: version.createdAt,
        }));
    }
    recordOutcome(modelId, version, latencyMs, success, request) {
        const versionState = this.getVersion(modelId, version);
        if (!versionState)
            return undefined;
        if (success) {
            versionState.metrics.recordSuccess(latencyMs, request.batchSize || 1);
        }
        else {
            versionState.metrics.recordFailure();
        }
        const drift = versionState.driftDetector.evaluate(request);
        return { metrics: versionState.metrics.snapshot(), drift };
    }
    getMonitoring(modelId) {
        const record = this.models.get(modelId);
        if (!record)
            return [];
        return Array.from(record.versions.values()).map((version) => ({
            version: version.version,
            metrics: version.metrics.snapshot(),
        }));
    }
    getDriftSignals(modelId) {
        const record = this.models.get(modelId);
        if (!record)
            return [];
        return Array.from(record.versions.values()).map((version) => ({
            version: version.version,
            signal: version.driftDetector.summary(),
        }));
    }
    getVersion(modelId, version) {
        return this.models.get(modelId)?.versions.get(version);
    }
    createRecord(modelId) {
        const record = {
            modelId,
            versions: new Map(),
            activeVersion: '',
            abTests: new Map(),
        };
        this.models.set(modelId, record);
        return record;
    }
    pickVariant(test) {
        const roll = Math.random() * test.variants.reduce((acc, variant) => acc + variant.weight, 0);
        let cumulative = 0;
        for (const variant of test.variants) {
            cumulative += variant.weight;
            if (roll <= cumulative) {
                return { version: variant.version };
            }
        }
        return test.variants.length > 0 ? { version: test.variants[0].version } : undefined;
    }
}
exports.ModelRegistry = ModelRegistry;
