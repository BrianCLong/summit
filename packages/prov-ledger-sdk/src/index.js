"use strict";
/**
 * @intelgraph/prov-ledger-sdk
 * TypeScript SDK for Provenance Ledger service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceTracker = exports.ProvLedgerClient = exports.HashVerificationSchema = exports.ManifestSchema = exports.ProvenanceChainSchema = exports.CreateClaimSchema = exports.ClaimSchema = void 0;
exports.createProvLedgerClient = createProvLedgerClient;
exports.generateContentHash = generateContentHash;
const zod_1 = require("zod");
const anyRecord = () => zod_1.z.record(zod_1.z.string(), zod_1.z.any());
// Schemas
exports.ClaimSchema = zod_1.z.object({
    id: zod_1.z.string(),
    content: anyRecord(),
    hash: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
    metadata: anyRecord().optional(),
    created_at: zod_1.z.string().datetime(),
});
exports.CreateClaimSchema = zod_1.z.object({
    content: anyRecord(),
    signature: zod_1.z.string().optional(),
    metadata: anyRecord().optional(),
});
exports.ProvenanceChainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    claim_id: zod_1.z.string(),
    transforms: zod_1.z.array(zod_1.z.string()),
    sources: zod_1.z.array(zod_1.z.string()),
    lineage: anyRecord(),
    created_at: zod_1.z.string().datetime(),
});
exports.ManifestSchema = zod_1.z.object({
    version: zod_1.z.string(),
    claims: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        hash: zod_1.z.string(),
        transforms: zod_1.z.array(zod_1.z.string()),
    })),
    hash_chain: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
    generated_at: zod_1.z.string().datetime(),
});
exports.HashVerificationSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    expected_hash: zod_1.z.string(),
    actual_hash: zod_1.z.string(),
    verified_at: zod_1.z.string().datetime(),
});
// SDK Client
class ProvLedgerClient {
    baseUrl;
    headers;
    constructor(baseUrl, headers = {}) {
        this.baseUrl = baseUrl;
        this.headers = headers;
    }
    async createClaim(claim) {
        const response = await fetch(`${this.baseUrl}/claims`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
            },
            body: JSON.stringify(claim),
        });
        if (!response.ok) {
            throw new Error(`Failed to create claim: ${response.status}`);
        }
        const data = await response.json();
        return exports.ClaimSchema.parse(data);
    }
    async getClaim(id) {
        const response = await fetch(`${this.baseUrl}/claims/${id}`, {
            headers: this.headers,
        });
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to get claim: ${response.status}`);
        }
        const data = await response.json();
        return exports.ClaimSchema.parse(data);
    }
    async getProvenanceByClaim(claimId) {
        const response = await fetch(`${this.baseUrl}/provenance?claimId=${encodeURIComponent(claimId)}`, {
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to get provenance: ${response.status}`);
        }
        const data = await response.json();
        return zod_1.z.array(exports.ProvenanceChainSchema).parse(data);
    }
    async createProvenanceChain(claimId, transforms, sources, lineage) {
        const response = await fetch(`${this.baseUrl}/provenance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
            },
            body: JSON.stringify({
                claimId,
                transforms,
                sources,
                lineage,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to create provenance chain: ${response.status}`);
        }
        const data = await response.json();
        return exports.ProvenanceChainSchema.parse(data);
    }
    async verifyHash(content, expectedHash) {
        const response = await fetch(`${this.baseUrl}/hash/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
            },
            body: JSON.stringify({
                content,
                expectedHash,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to verify hash: ${response.status}`);
        }
        const data = await response.json();
        return exports.HashVerificationSchema.parse(data);
    }
    async exportManifest() {
        const response = await fetch(`${this.baseUrl}/export/manifest`, {
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to export manifest: ${response.status}`);
        }
        const data = await response.json();
        return exports.ManifestSchema.parse(data);
    }
    async healthCheck() {
        const response = await fetch(`${this.baseUrl}/health`, {
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        return response.json();
    }
}
exports.ProvLedgerClient = ProvLedgerClient;
// Utility functions
function createProvLedgerClient(baseUrl, authorityId, reasonForAccess) {
    const headers = {};
    if (authorityId) {
        headers['X-Authority-ID'] = authorityId;
    }
    if (reasonForAccess) {
        headers['X-Reason-For-Access'] = reasonForAccess;
    }
    return new ProvLedgerClient(baseUrl, headers);
}
function generateContentHash(content) {
    // Simple hash generation - in production, use crypto module
    return Buffer.from(JSON.stringify(content, Object.keys(content).sort())).toString('base64');
}
// Higher-level convenience functions
class ProvenanceTracker {
    client;
    constructor(client) {
        this.client = client;
    }
    async trackDataIngestion(dataSource, dataset, metadata) {
        return this.client.createClaim({
            content: {
                type: 'data_ingestion',
                source: dataSource,
                dataset,
            },
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }
    async trackTransformation(sourceClaimId, transformType, transformConfig, resultData) {
        // Create claim for transformed data
        const claim = await this.client.createClaim({
            content: {
                type: 'data_transformation',
                transform_type: transformType,
                config: transformConfig,
                result: resultData,
            },
            metadata: {
                source_claim_id: sourceClaimId,
                timestamp: new Date().toISOString(),
            },
        });
        // Create provenance chain
        const provenance = await this.client.createProvenanceChain(claim.id, [transformType], [sourceClaimId], {
            transform_config: transformConfig,
            input_hash: '', // Would calculate from source claim
            output_hash: claim.hash,
        });
        return { claim, provenance };
    }
    async trackExport(sourceClaimIds, exportFormat, exportData) {
        const claim = await this.client.createClaim({
            content: {
                type: 'data_export',
                format: exportFormat,
                data: exportData,
            },
            metadata: {
                source_claims: sourceClaimIds,
                timestamp: new Date().toISOString(),
            },
        });
        const provenance = await this.client.createProvenanceChain(claim.id, ['export'], sourceClaimIds, {
            export_format: exportFormat,
            source_claims: sourceClaimIds,
        });
        return { claim, provenance };
    }
    async getFullLineage(claimId) {
        const [claim, chains] = await Promise.all([
            this.client.getClaim(claimId),
            this.client.getProvenanceByClaim(claimId),
        ]);
        if (!claim) {
            throw new Error(`Claim not found: ${claimId}`);
        }
        // Get all source claims
        const sourceClaimIds = new Set();
        chains.forEach((chain) => {
            chain.sources.forEach((source) => sourceClaimIds.add(source));
        });
        const sourcesClaims = await Promise.all(Array.from(sourceClaimIds).map((id) => this.client.getClaim(id)));
        return {
            claim,
            chains,
            sourcesClaims: sourcesClaims.filter((c) => c !== null),
        };
    }
}
exports.ProvenanceTracker = ProvenanceTracker;
