"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConnector = exports.DataSubjectFulfillmentEngine = void 0;
const redaction_js_1 = require("./redaction.js");
const proofs_js_1 = require("./proofs.js");
const cloneResponse = (response) => JSON.parse(JSON.stringify(response));
class DataSubjectFulfillmentEngine {
    options;
    connectors = new Map();
    cache = new Map();
    constructor(options) {
        this.options = options;
        options.connectors.forEach((connector) => {
            if (this.connectors.has(connector.name)) {
                throw new Error(`Duplicate connector registered: ${connector.name}`);
            }
            this.connectors.set(connector.name, connector);
        });
    }
    async execute(request) {
        const verification = await this.options.identityVerifier.verify(request);
        if (!verification.verified) {
            throw new Error(`Identity verification failed: ${verification.reason ?? 'unknown reason'}`);
        }
        const cacheKey = request.replayKey ?? request.requestId;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            const cloned = cloneResponse(cached);
            return {
                ...cloned,
                meta: this.buildMeta(true, verification),
            };
        }
        let response;
        switch (request.operation) {
            case 'export':
                response = await this.handleExport(request, verification);
                break;
            case 'rectify':
                response = await this.handleRectify(request, verification);
                break;
            case 'delete':
                response = await this.handleDelete(request, verification);
                break;
            default:
                throw new Error(`Unsupported DSAR operation: ${request.operation}`);
        }
        this.cache.set(cacheKey, response);
        return response;
    }
    buildMeta(idempotentReplay, verification) {
        return {
            idempotentReplay,
            identityVerification: verification,
        };
    }
    async handleExport(request, verification) {
        const connectorPayloads = [];
        for (const connector of this.connectors.values()) {
            const collected = await connector.collect(request.subjectId, request.tenantId);
            const { data, applied } = (0, redaction_js_1.applyConnectorRedactions)(connector.name, collected, this.options.redactionRules);
            connectorPayloads.push({
                name: connector.name,
                data,
                applied,
                hash: (0, proofs_js_1.hashDeterministic)(data),
            });
        }
        const generatedAt = new Date().toISOString();
        const manifest = {
            requestId: request.requestId,
            subjectId: request.subjectId,
            tenantId: request.tenantId,
            generatedAt,
            connectors: connectorPayloads
                .map((entry) => ({
                name: entry.name,
                itemCount: Array.isArray(entry.data)
                    ? entry.data.length
                    : entry.data && typeof entry.data === 'object'
                        ? Object.keys(entry.data).length
                        : 1,
                hash: entry.hash,
            }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            redactionsApplied: Array.from(new Set(connectorPayloads.flatMap((entry) => entry.applied))).sort(),
        };
        const connectorsPayload = connectorPayloads
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .reduce((acc, entry) => {
            acc[entry.name] = entry.data;
            return acc;
        }, {});
        const payload = JSON.stringify({
            requestId: request.requestId,
            subjectId: request.subjectId,
            tenantId: request.tenantId,
            generatedAt,
            connectors: connectorsPayload,
        });
        const signedPack = this.options.signer.sign(payload, manifest);
        const objectKey = `${request.tenantId}/${request.requestId}.json`;
        const location = await this.options.storage.putObject(objectKey, JSON.stringify(signedPack));
        await this.options.kafka.publish('dsar.fulfillment', {
            requestId: request.requestId,
            operation: 'export',
            subjectId: request.subjectId,
            tenantId: request.tenantId,
            location,
        });
        const response = {
            type: 'export',
            result: {
                location,
                pack: signedPack,
            },
            meta: this.buildMeta(false, verification),
        };
        return response;
    }
    async handleRectify(request, verification) {
        const payload = request.payload ?? {};
        const proofs = [];
        for (const connector of this.connectors.values()) {
            if (typeof connector.rectify !== 'function') {
                continue;
            }
            const connectorPatch = payload[connector.name];
            if (!connectorPatch || Object.keys(connectorPatch).length === 0) {
                continue;
            }
            const before = await connector.snapshot();
            await connector.rectify(request.subjectId, request.tenantId, connectorPatch);
            const after = await connector.snapshot();
            proofs.push((0, proofs_js_1.buildRectificationProof)(request.requestId, connector.name, before, after, connectorPatch));
            await this.options.kafka.publish('dsar.fulfillment', {
                requestId: request.requestId,
                operation: 'rectify',
                subjectId: request.subjectId,
                tenantId: request.tenantId,
                connector: connector.name,
            });
        }
        return {
            type: 'rectify',
            result: { proofs },
            meta: this.buildMeta(false, verification),
        };
    }
    async handleDelete(request, verification) {
        const proofs = [];
        for (const connector of this.connectors.values()) {
            if (typeof connector.delete !== 'function') {
                continue;
            }
            await connector.delete(request.subjectId, request.tenantId);
            const snapshot = await connector.snapshot();
            proofs.push((0, proofs_js_1.buildDeletionProof)(request.requestId, connector.name, request.subjectId, snapshot));
            await this.options.kafka.publish('dsar.fulfillment', {
                requestId: request.requestId,
                operation: 'delete',
                subjectId: request.subjectId,
                tenantId: request.tenantId,
                connector: connector.name,
            });
        }
        return {
            type: 'delete',
            result: { proofs },
            meta: this.buildMeta(false, verification),
        };
    }
}
exports.DataSubjectFulfillmentEngine = DataSubjectFulfillmentEngine;
const registerConnector = (engine, connector) => {
    const map = engine
        .connectors;
    if (map.has(connector.name)) {
        throw new Error(`Connector ${connector.name} already registered`);
    }
    map.set(connector.name, connector);
};
exports.registerConnector = registerConnector;
