"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedConfigService = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
const events_1 = require("events");
const zod_1 = require("zod");
const featureFlags_js_1 = require("../featureFlags.js");
const SECRET_REFERENCE_KEY = '__secretRef';
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
function isSecretReference(value) {
    return Boolean(value &&
        typeof value === 'object' &&
        SECRET_REFERENCE_KEY in value &&
        typeof value[SECRET_REFERENCE_KEY] ===
            'object');
}
function deepMerge(base, override) {
    if (!override) {
        return base;
    }
    const result = Array.isArray(base) ? [...base] : { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value === undefined) {
            continue;
        }
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            base &&
            typeof base[key] === 'object' &&
            !Array.isArray(base[key])) {
            result[key] = deepMerge(base[key], value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function collectDiffs(expected, actual, path = []) {
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
        return [];
    }
    if (typeof expected !== 'object' ||
        expected === null ||
        typeof actual !== 'object' ||
        actual === null) {
        return [
            {
                path: path.join('.') || 'root',
                expected,
                actual,
            },
        ];
    }
    const keys = new Set([
        ...Object.keys(expected),
        ...Object.keys(actual),
    ]);
    const deltas = [];
    for (const key of keys) {
        deltas.push(...collectDiffs(expected[key], actual[key], [
            ...path,
            key,
        ]));
    }
    return deltas;
}
function selectVariant(abTest, identifier, assignmentValue) {
    if (abTest.endAt && abTest.endAt.getTime() < Date.now()) {
        return undefined;
    }
    const totalWeight = abTest.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (totalWeight <= 0) {
        return undefined;
    }
    const normalized = abTest.variants.map((variant) => ({
        ...variant,
        weight: variant.weight / totalWeight,
    }));
    const value = assignmentValue !== undefined
        ? assignmentValue
        : parseInt((0, crypto_1.createHash)('sha1').update(identifier).digest('hex').slice(0, 8), 16) / 0xffffffff;
    let cumulative = 0;
    for (const variant of normalized) {
        cumulative += variant.weight;
        if (value <= cumulative) {
            return variant;
        }
    }
    return normalized[normalized.length - 1];
}
class DistributedConfigService {
    repository;
    options;
    schemas = new Map();
    watchers = new Map();
    events = new events_1.EventEmitter();
    clock;
    constructor(repository, options = {}) {
        this.repository = repository;
        this.options = options;
        this.clock = options.clock ?? (() => new Date());
    }
    registerSchema(configId, schema) {
        this.schemas.set(configId, schema);
    }
    async createOrUpdate(configId, options) {
        const schema = this.schemas.get(configId);
        if (schema) {
            schema.parse(options.config);
            if (options.overrides) {
                for (const override of Object.values(options.overrides)) {
                    if (override) {
                        schema.partial().parse(override);
                    }
                }
            }
            if (options.abTest) {
                zod_1.z.object({
                    experimentId: zod_1.z.string(),
                    variants: zod_1.z.array(zod_1.z.object({
                        name: zod_1.z.string(),
                        weight: zod_1.z.number().positive(),
                        config: schema.partial(),
                    })),
                    startAt: zod_1.z.date(),
                    endAt: zod_1.z.date().optional(),
                    targetingRules: zod_1.z.record(zod_1.z.any()).optional(),
                }).parse(options.abTest);
            }
            if (options.canary) {
                zod_1.z.object({
                    environment: zod_1.z.string(),
                    trafficPercent: zod_1.z.number().min(0).max(100),
                    config: schema.partial(),
                    startAt: zod_1.z.date(),
                    endAt: zod_1.z.date().optional(),
                    guardRailMetrics: zod_1.z.array(zod_1.z.string()).optional(),
                }).parse(options.canary);
            }
        }
        const latest = await this.repository.getLatestVersion(configId);
        const nextVersionNumber = latest ? latest.metadata.version + 1 : 1;
        const metadata = {
            version: nextVersionNumber,
            createdAt: this.clock(),
            createdBy: options.metadata.actor,
            message: options.metadata.message,
            source: options.metadata.source,
            commitId: options.metadata.commitId,
        };
        const payload = {
            id: configId,
            config: deepClone(options.config),
            overrides: deepClone(options.overrides ?? {}),
            metadata,
            checksum: this.computeChecksum(options.config, options.overrides, options.abTest, options.canary),
            abTest: options.abTest,
            canary: options.canary,
            featureFlags: options.featureFlags,
        };
        const auditEntry = {
            version: metadata.version,
            actor: options.metadata.actor,
            timestamp: metadata.createdAt,
            message: options.metadata.message,
            changes: this.computeChanges(latest?.config ?? {}, options.config),
        };
        await this.repository.saveVersion(configId, payload, auditEntry);
        if (payload.featureFlags) {
            await this.syncFeatureFlags(payload.featureFlags);
        }
        await this.notifyWatchers(configId, payload);
        return payload;
    }
    async getConfig(configId, options = {}) {
        const version = await this.repository.getLatestVersion(configId);
        if (!version) {
            throw new Error(`Config ${configId} not found`);
        }
        let effectiveConfig = deepClone(version.config);
        if (options.environment && version.overrides[options.environment]) {
            effectiveConfig = deepMerge(effectiveConfig, version.overrides[options.environment]);
        }
        if (version.canary &&
            this.isCanaryActive(version.canary, options.environment)) {
            const sample = options.assignmentValue ??
                this.hashAssignment(options.actorId ?? options.requestId);
            if (sample <= version.canary.trafficPercent / 100) {
                effectiveConfig = deepMerge(effectiveConfig, version.canary.config);
            }
        }
        if (version.abTest && this.isABTestActive(version.abTest)) {
            const identifier = options.actorId ?? options.requestId ?? 'anonymous';
            const variant = options.abTestVariant &&
                version.abTest.variants.find((entry) => entry.name === options.abTestVariant)
                ? version.abTest.variants.find((entry) => entry.name === options.abTestVariant)
                : selectVariant(version.abTest, identifier, options.assignmentValue);
            if (variant) {
                effectiveConfig = deepMerge(effectiveConfig, variant.config);
            }
        }
        if (options.resolveSecrets) {
            effectiveConfig = await this.resolveSecrets(effectiveConfig);
        }
        return { version, effectiveConfig };
    }
    async rollback(configId, versionNumber, actor, message) {
        const target = await this.repository.getVersion(configId, versionNumber);
        if (!target) {
            throw new Error(`Version ${versionNumber} for ${configId} not found`);
        }
        return this.createOrUpdate(configId, {
            config: target.config,
            overrides: target.overrides,
            metadata: { actor, message: message ?? `Rollback to ${versionNumber}` },
            abTest: target.abTest,
            canary: target.canary,
            featureFlags: target.featureFlags,
        });
    }
    async detectDrift(configId, environment, actualConfig) {
        const { version, effectiveConfig } = await this.getConfig(configId, {
            environment,
        });
        const deltas = collectDiffs(effectiveConfig, actualConfig);
        return {
            configId,
            environment,
            version: version.metadata.version,
            driftDetected: deltas.length > 0,
            deltas,
            generatedAt: this.clock(),
        };
    }
    async recordApplied(configId, environment) {
        const version = await this.repository.getLatestVersion(configId);
        if (!version) {
            throw new Error(`Config ${configId} not found`);
        }
        const state = {
            environment,
            version: version.metadata.version,
            checksum: version.checksum,
            appliedAt: this.clock(),
        };
        await this.repository.recordAppliedState(configId, state);
        return state;
    }
    async getAuditTrail(configId) {
        return this.repository.getAuditTrail(configId);
    }
    registerWatcher(configId, watcher) {
        const watchers = this.watchers.get(configId) ?? new Set();
        watchers.add(watcher);
        this.watchers.set(configId, watchers);
        return () => {
            watchers.delete(watcher);
            if (watchers.size === 0) {
                this.watchers.delete(configId);
            }
        };
    }
    on(event, listener) {
        this.events.on(event, listener);
    }
    async notifyWatchers(configId, version) {
        const watchers = this.watchers.get(configId);
        if (watchers) {
            for (const watcher of watchers) {
                await watcher({ configId, version });
            }
        }
        this.events.emit('config:updated', version);
    }
    computeChecksum(config, overrides, abTest, canary) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ config, overrides, abTest, canary }))
            .digest('hex');
    }
    computeChanges(prevConfig, nextConfig) {
        const deltas = collectDiffs(prevConfig, nextConfig);
        return deltas.map((delta) => delta.path);
    }
    async resolveSecrets(config) {
        if (!this.options.secretResolver) {
            return config;
        }
        const traverse = async (value) => {
            if (Array.isArray(value)) {
                return Promise.all(value.map((item) => traverse(item)));
            }
            if (isSecretReference(value)) {
                const resolved = await this.options.secretResolver.resolve(value[SECRET_REFERENCE_KEY]);
                return resolved;
            }
            if (value && typeof value === 'object') {
                const entries = await Promise.all(Object.entries(value).map(async ([key, val]) => [
                    key,
                    await traverse(val),
                ]));
                return Object.fromEntries(entries);
            }
            return value;
        };
        return (await traverse(config));
    }
    hashAssignment(identifier) {
        if (!identifier) {
            return Math.random();
        }
        return (parseInt((0, crypto_1.createHash)('sha1').update(identifier).digest('hex').slice(0, 8), 16) / 0xffffffff);
    }
    isCanaryActive(canary, environment) {
        if (!environment || canary.environment !== environment) {
            return false;
        }
        const now = this.clock().getTime();
        if (canary.startAt.getTime() > now) {
            return false;
        }
        if (canary.endAt && canary.endAt.getTime() < now) {
            return false;
        }
        return canary.trafficPercent > 0;
    }
    isABTestActive(abTest) {
        const now = this.clock().getTime();
        return (abTest.startAt.getTime() <= now &&
            (!abTest.endAt || abTest.endAt.getTime() >= now));
    }
    async syncFeatureFlags(flags) {
        if (this.options.featureFlagAdapter) {
            await this.options.featureFlagAdapter.updateFlags(flags);
        }
        else {
            featureFlags_js_1.FeatureFlags.getInstance().update(flags);
        }
    }
}
exports.DistributedConfigService = DistributedConfigService;
exports.default = DistributedConfigService;
