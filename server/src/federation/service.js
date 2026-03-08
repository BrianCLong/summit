"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederationService = void 0;
const types_js_1 = require("./types.js");
const tokens_js_1 = require("./tokens.js");
const hashing_js_1 = require("./hashing.js");
const ledger_js_1 = require("../provenance/ledger.js");
const crypto_1 = require("crypto");
class FederationService {
    static requests = new Map();
    // Governance: Mock Policy Config
    static allowedTypes = new Map([
        // By default allow EMAIL and PHONE for all
        ['default', new Set([types_js_1.IdentifierType.EMAIL, types_js_1.IdentifierType.PHONE])]
    ]);
    static isTypeAllowed(tenantId, type) {
        const allowed = this.allowedTypes.get(tenantId) || this.allowedTypes.get('default');
        return allowed ? allowed.has(type) : false;
    }
    // Helper for seeding tokens (Ingest simulation)
    static async ingestToken(tenantId, value, type, metadata = {}) {
        if (!this.isTypeAllowed(tenantId, type)) {
            throw new Error(`Identifier type ${type} is not allowed for tenant ${tenantId}`);
        }
        const tokenString = hashing_js_1.IdentifierHasher.hash(value, type, tenantId);
        const token = {
            token: tokenString,
            type,
            tenantId,
            metadata,
            createdAt: new Date()
        };
        tokens_js_1.TokenStore.addToken(token);
        // Audit the ingestion (creation of hashed token)
        /* await provenanceLedger.appendEntry({
          tenantId,
          actionType: 'TOKEN_INGEST',
          resourceType: 'HashedToken',
          resourceId: tokenString,
          actorId: 'system',
          actorType: 'system',
          payload: { type, metadataStub: true },
          metadata: { purpose: 'ingest' }
        }); */
        return token;
    }
    // Generate hashes for a specific target tenant (Simulates client-side hashing if they had the salt, or trusted server prep)
    static generateHashesForTarget(values, type, targetTenantId) {
        return values.map(v => hashing_js_1.IdentifierHasher.hash(v, type, targetTenantId));
    }
    static async createDeconflictionRequest(requesterTenantId, targetTenantId, tokens, // List of hashed tokens (hashed with targetTenantId salt)
    purpose, actorId = 'unknown') {
        if (!purpose) {
            throw new Error("Reason-for-access (purpose) is mandatory.");
        }
        // Policy Check: Are we spamming? (Stub)
        const id = (0, crypto_1.randomUUID)();
        const request = {
            id,
            requesterTenantId,
            targetTenantId,
            purpose,
            tokens,
            status: 'PENDING',
            createdAt: new Date()
        };
        this.requests.set(id, request);
        // Audit the Request Creation
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: requesterTenantId,
            actionType: 'DECONFLICTION_REQUEST',
            resourceType: 'DeconflictionRequest',
            resourceId: id,
            actorId,
            actorType: 'user',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: id,
                entityType: 'DeconflictionRequest',
                targetTenantId,
                tokenCount: tokens.length,
                purpose
            },
            metadata: { purpose }
        });
        return request;
    }
    static async processRequest(requestId, actorId = 'system') {
        const request = this.requests.get(requestId);
        if (!request)
            throw new Error("Request not found");
        if (request.status !== 'PENDING')
            return request;
        // Execute Overlap Logic
        const targetTokens = tokens_js_1.TokenStore.getTokens(request.targetTenantId);
        // Create a Set for O(1) lookup
        const targetTokenSet = new Set(targetTokens.map(t => t.token));
        const matchedTokens = [];
        for (const token of request.tokens) {
            if (targetTokenSet.has(token)) {
                matchedTokens.push(token);
            }
        }
        const result = {
            overlapCount: matchedTokens.length,
            matchedTokens,
            metadata: {
                entityCount: matchedTokens.length, // Simplified 1-to-1
                summary: matchedTokens.length > 0 ? 'Overlap Detected' : 'No Overlap'
            },
            timestamp: new Date()
        };
        request.status = 'COMPLETED';
        request.result = result;
        this.requests.set(requestId, request);
        // Audit the Result
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: request.requesterTenantId,
            actionType: 'DECONFLICTION_COMPLETE',
            resourceType: 'DeconflictionRequest',
            resourceId: requestId,
            actorId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'UPDATE',
                entityId: requestId,
                entityType: 'DeconflictionRequest',
                overlapCount: result.overlapCount
            },
            metadata: { purpose: request.purpose }
        });
        return request;
    }
    static getRequest(id) {
        return this.requests.get(id);
    }
    static exportToSTIX(subgraphId, payload, provenance) {
        return {
            type: "bundle",
            id: `bundle--${subgraphId}`,
            spec_version: "2.1",
            objects: [
                {
                    type: "report",
                    id: `report--${subgraphId}`,
                    name: "Federated Threat Intelligence Subgraph",
                    published: new Date().toISOString(),
                    object_refs: [],
                    custom_properties: {
                        x_summit_payload: payload,
                        x_summit_provenance: provenance
                    }
                }
            ]
        };
    }
    static exportToMISP(subgraphId, payload, provenance) {
        return {
            Event: {
                info: "Federated Threat Intelligence Subgraph",
                date: new Date().toISOString().split('T')[0],
                uuid: subgraphId,
                Attribute: [
                    {
                        type: "text",
                        category: "Other",
                        value: "See payload attachment",
                        comment: "Imported via Summit Federation",
                        x_summit_payload: payload,
                        x_summit_provenance: provenance
                    }
                ]
            }
        };
    }
}
exports.FederationService = FederationService;
