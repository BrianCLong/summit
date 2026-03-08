"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopedRecordApi = exports.RecordFramework = exports.AuditTrail = exports.RecordEntrySchema = exports.RecordLineageSchema = exports.RecordVersionSchema = exports.RecordTemplateSchema = exports.RecordMetadataSchema = void 0;
exports.createRecordFramework = createRecordFramework;
exports.createScopedRecordApi = createScopedRecordApi;
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const ClassificationSchema = zod_1.z.enum([
    'public',
    'internal',
    'restricted',
    'confidential',
    'secret',
]);
exports.RecordMetadataSchema = zod_1.z.object({
    owner: zod_1.z.string(),
    classification: ClassificationSchema,
    retentionClass: zod_1.z.string(),
    provenance: zod_1.z.object({
        source: zod_1.z.string(),
        transforms: zod_1.z.array(zod_1.z.string()).default([]),
        exports: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    templateId: zod_1.z.string().optional(),
});
exports.RecordTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    domain: zod_1.z.enum(['event', 'object', 'message', 'file']),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    defaultMetadata: exports.RecordMetadataSchema,
    requiredFields: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.RecordVersionSchema = zod_1.z.object({
    versionId: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    hash: zod_1.z.string(),
    data: zod_1.z.unknown(),
    diff: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdBy: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.RecordLineageSchema = zod_1.z.object({
    parents: zod_1.z.array(zod_1.z.string()).default([]),
    children: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.RecordEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    domain: zod_1.z.enum(['event', 'object', 'message', 'file']),
    type: zod_1.z.string(),
    immutability: zod_1.z.enum(['append-only', 'versioned']),
    metadata: exports.RecordMetadataSchema,
    lineage: exports.RecordLineageSchema,
    versions: zod_1.z.array(exports.RecordVersionSchema),
    deletedAt: zod_1.z.date().optional(),
    deletionAttestation: zod_1.z.string().optional(),
});
function calculateHash(payload, previousHash) {
    const hash = crypto_1.default.createHash('sha256');
    hash.update(JSON.stringify(payload));
    if (previousHash) {
        hash.update(previousHash);
    }
    return hash.digest('hex');
}
function diffObjects(before, after) {
    const diff = {};
    const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    for (const key of keys) {
        const beforeValue = before?.[key];
        const afterValue = after?.[key];
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
            diff[key] = { before: beforeValue, after: afterValue };
        }
    }
    return diff;
}
function assertRequiredFields(required, data, label) {
    if (!required.length)
        return;
    if (typeof data !== 'object' || data === null) {
        throw new Error(`${label} is missing required fields: ${required.join(', ')}`);
    }
    const missing = required.filter(key => !(key in data));
    if (missing.length) {
        throw new Error(`${label} is missing required fields: ${missing.join(', ')}`);
    }
}
class AuditTrail {
    events = [];
    record(event) {
        const previousHash = event.previousHash ?? this.events.at(-1)?.hash ?? '';
        const fullEvent = {
            ...event,
            previousHash,
            hash: calculateHash({ ...event, previousHash }),
        };
        this.events.push(fullEvent);
        return fullEvent;
    }
    getEvents() {
        return [...this.events];
    }
    verifyChain() {
        let previousHash = '';
        for (const evt of this.events) {
            const recalculated = calculateHash({ ...evt, previousHash: evt.previousHash });
            if (recalculated !== evt.hash || evt.previousHash !== previousHash) {
                return false;
            }
            previousHash = evt.hash;
        }
        return true;
    }
}
exports.AuditTrail = AuditTrail;
class RecordFramework {
    records = new Map();
    templates = new Map();
    migratedDomains = new Set();
    retiredLegacy = new Set();
    auditTrail = new AuditTrail();
    domains = new Map();
    lastIntegrityCheck;
    registerDomain(definition) {
        this.domains.set(definition.domain, definition);
    }
    registerTemplate(template) {
        const validated = exports.RecordTemplateSchema.parse(template);
        this.templates.set(validated.id, validated);
    }
    createRecord(params) {
        const domainDefinition = this.domains.get(params.domain);
        if (domainDefinition?.allowedTypes && !domainDefinition.allowedTypes.includes(params.type)) {
            throw new Error(`Type ${params.type} is not permitted for domain ${params.domain}`);
        }
        const recordId = params.id ?? crypto_1.default.randomUUID();
        const metadata = exports.RecordMetadataSchema.parse(params.metadata);
        const lineage = exports.RecordLineageSchema.parse({
            parents: params.lineage?.parents ?? [],
            children: params.lineage?.children ?? [],
        });
        if (domainDefinition?.requiredFields) {
            assertRequiredFields(domainDefinition.requiredFields, params.data, `Domain ${params.domain}`);
        }
        const immutabilityMode = params.immutability ?? domainDefinition?.defaultImmutability ?? 'versioned';
        const version = exports.RecordVersionSchema.parse({
            versionId: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            hash: calculateHash(params.data),
            data: params.data,
            createdBy: params.createdBy,
        });
        const entry = exports.RecordEntrySchema.parse({
            id: recordId,
            domain: params.domain,
            type: params.type,
            immutability: immutabilityMode,
            metadata,
            lineage,
            versions: [version],
        });
        this.records.set(recordId, entry);
        this.auditTrail.record({
            recordId,
            action: 'create',
            actor: params.createdBy,
            timestamp: version.timestamp,
            details: { type: params.type, domain: params.domain },
            previousHash: this.auditTrail.getEvents().at(-1)?.hash,
        });
        return entry;
    }
    applyTemplate(templateId, overrides) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        const metadata = { ...template.defaultMetadata, ...overrides.metadata, templateId };
        assertRequiredFields(template.requiredFields, overrides.data, `Template ${templateId}`);
        return this.createRecord({
            domain: template.domain,
            type: overrides.type ?? template.name,
            immutability: 'versioned',
            metadata,
            data: overrides.data,
            createdBy: overrides.createdBy,
            lineage: overrides.lineage,
        });
    }
    addChild(recordId, childId) {
        const parent = this.records.get(recordId);
        const child = this.records.get(childId);
        if (!parent || !child) {
            throw new Error('Invalid lineage link');
        }
        parent.lineage.children.push(childId);
        child.lineage.parents.push(recordId);
    }
    appendVersion(recordId, data, createdBy, reason) {
        const record = this.records.get(recordId);
        if (!record) {
            throw new Error('Record not found');
        }
        const latest = record.versions.at(-1);
        const diff = record.immutability === 'versioned'
            ? diffObjects(latest?.data, data)
            : undefined;
        if (record.immutability === 'append-only' && latest) {
            const attemptedDiff = diffObjects(latest.data, data);
            const breakingKeys = Object.entries(attemptedDiff).filter(([, change]) => change.before !== undefined && JSON.stringify(change.before) !== JSON.stringify(change.after));
            if (breakingKeys.length) {
                throw new Error(`Append-only records cannot modify existing fields: ${breakingKeys.map(([k]) => k).join(', ')}`);
            }
        }
        const version = exports.RecordVersionSchema.parse({
            versionId: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            hash: calculateHash(data, latest?.hash),
            data,
            diff: diff && Object.keys(diff).length > 0 ? diff : undefined,
            createdBy,
            reason,
        });
        record.versions.push(version);
        this.auditTrail.record({
            recordId,
            action: 'update',
            actor: createdBy,
            timestamp: version.timestamp,
            details: { reason },
            previousHash: this.auditTrail.getEvents().at(-1)?.hash,
        });
        return version;
    }
    search(query) {
        const results = [];
        for (const record of this.records.values()) {
            if (record.deletedAt)
                continue;
            if (query.owner && record.metadata.owner !== query.owner)
                continue;
            if (query.classification && record.metadata.classification !== query.classification)
                continue;
            if (query.domain && record.domain !== query.domain)
                continue;
            if (query.type && record.type !== query.type)
                continue;
            if (query.tags && !query.tags.every(tag => record.metadata.tags.includes(tag)))
                continue;
            const createdAt = record.versions[0]?.timestamp;
            if (!createdAt)
                continue;
            if (query.from && createdAt < query.from)
                continue;
            if (query.to && createdAt > query.to)
                continue;
            results.push(record);
        }
        return results;
    }
    exportBundle(recordIds) {
        const manifest = [];
        const payload = {};
        for (const id of recordIds) {
            const record = this.records.get(id);
            if (!record || record.deletedAt)
                continue;
            const latest = record.versions.at(-1);
            manifest.push({ id, versionId: latest.versionId, hash: latest.hash });
            payload[id] = { ...record, versions: record.versions };
            this.auditTrail.record({
                recordId: id,
                action: 'export',
                actor: 'system',
                timestamp: new Date(),
                details: { versionId: latest.versionId },
                previousHash: this.auditTrail.getEvents().at(-1)?.hash,
            });
        }
        const bundleHash = calculateHash({ manifest, payload });
        return { manifest, bundleHash, payload };
    }
    verifyIntegrity(recordId) {
        const violations = [];
        const records = recordId ? [this.records.get(recordId)].filter(Boolean) : [...this.records.values()];
        for (const record of records) {
            let previousHash;
            for (const version of record.versions) {
                const recalculated = calculateHash(version.data, previousHash);
                if (recalculated !== version.hash) {
                    violations.push({
                        recordId: record.id,
                        versionId: version.versionId,
                        expected: version.hash,
                        actual: recalculated,
                    });
                }
                previousHash = version.hash;
            }
        }
        return violations;
    }
    runIntegrityJob(recordId) {
        const violations = this.verifyIntegrity(recordId);
        const ranAt = new Date();
        this.lastIntegrityCheck = { ranAt, violations };
        return this.lastIntegrityCheck;
    }
    deleteRecord(recordId, actor, attestation) {
        const record = this.records.get(recordId);
        if (!record) {
            throw new Error('Record not found');
        }
        record.deletedAt = new Date();
        record.deletionAttestation = attestation;
        this.auditTrail.record({
            recordId,
            action: 'delete',
            actor,
            timestamp: record.deletedAt,
            details: { attestation },
            previousHash: this.auditTrail.getEvents().at(-1)?.hash,
        });
    }
    markDomainMigrated(domain) {
        this.migratedDomains.add(domain);
    }
    retireLegacyPath(domain) {
        if (!this.migratedDomains.has(domain)) {
            throw new Error('Cannot retire legacy paths before migration');
        }
        this.retiredLegacy.add(domain);
    }
    isLegacyRetired(domain) {
        return this.retiredLegacy.has(domain);
    }
    getAuditTrail() {
        return this.auditTrail;
    }
    getRecord(recordId) {
        return this.records.get(recordId);
    }
    getIntegrityStatus() {
        return this.lastIntegrityCheck;
    }
}
exports.RecordFramework = RecordFramework;
class ScopedRecordApi {
    framework;
    scope;
    constructor(framework, scope) {
        this.framework = framework;
        this.scope = scope;
    }
    assertAccess(record) {
        if (this.scope.allowedDomains && !this.scope.allowedDomains.includes(record.domain)) {
            throw new Error('Domain not permitted for actor');
        }
        if (this.scope.allowedClassifications && !this.scope.allowedClassifications.includes(record.metadata.classification)) {
            throw new Error('Classification not permitted for actor');
        }
        if (this.scope.owners && !this.scope.owners.includes(record.metadata.owner)) {
            throw new Error('Owner scope violated');
        }
    }
    create(params) {
        const record = this.framework.createRecord(params);
        this.assertAccess(record);
        return record;
    }
    search(query) {
        const results = this.framework.search(query);
        return results.filter(r => {
            try {
                this.assertAccess(r);
                return true;
            }
            catch {
                return false;
            }
        });
    }
    append(recordId, data, createdBy, reason) {
        const record = this.framework.getRecord(recordId);
        if (!record) {
            throw new Error('Record not found');
        }
        this.assertAccess(record);
        return this.framework.appendVersion(recordId, data, createdBy, reason);
    }
    export(recordIds) {
        for (const id of recordIds) {
            const record = this.framework.getRecord(id);
            if (record)
                this.assertAccess(record);
        }
        return this.framework.exportBundle(recordIds);
    }
    delete(recordId, actor, attestation) {
        const record = this.framework.getRecord(recordId);
        if (!record) {
            throw new Error('Record not found');
        }
        this.assertAccess(record);
        this.framework.deleteRecord(recordId, actor, attestation);
    }
}
exports.ScopedRecordApi = ScopedRecordApi;
function createRecordFramework() {
    return new RecordFramework();
}
function createScopedRecordApi(framework, scope) {
    return new ScopedRecordApi(framework, scope);
}
