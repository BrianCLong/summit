"use strict";
/**
 * GraphQL Resolvers for Provenance & Claims Ledger
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.setDatabasePool = setDatabasePool;
const graphql_1 = require("graphql");
const crypto_1 = __importDefault(require("crypto"));
// Database pool (shared with REST service)
let pool;
function setDatabasePool(dbPool) {
    pool = dbPool;
}
// ============================================================================
// Custom Scalars
// ============================================================================
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO 8601 DateTime',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return new Date(value).toISOString();
    },
    parseValue(value) {
        return new Date(value);
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON object',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.OBJECT) {
            return ast;
        }
        return null;
    },
});
// ============================================================================
// Utility Functions
// ============================================================================
function generateHash(content) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(content, Object.keys(content).sort()))
        .digest('hex');
}
function generateChecksum(content, algorithm = 'sha256') {
    const hash = crypto_1.default.createHash(algorithm);
    if (Buffer.isBuffer(content)) {
        hash.update(content);
    }
    else if (typeof content === 'string') {
        hash.update(content);
    }
    else {
        hash.update(JSON.stringify(content));
    }
    return hash.digest('hex');
}
function generateClaimId() {
    return `claim_${crypto_1.default.randomUUID()}`;
}
function generateEvidenceId() {
    return `evidence_${crypto_1.default.randomUUID()}`;
}
function generateProvenanceId() {
    return `prov_${crypto_1.default.randomUUID()}`;
}
function generateCaseId() {
    return `case_${crypto_1.default.randomUUID()}`;
}
function computeMerkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    if (hashes.length === 1)
        return hashes[0];
    const newLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
            const combined = hashes[i] + hashes[i + 1];
            newLevel.push(generateChecksum(combined));
        }
        else {
            newLevel.push(hashes[i]);
        }
    }
    return computeMerkleRoot(newLevel);
}
// ============================================================================
// Query Resolvers
// ============================================================================
const Query = {
    async claim(_, { id }, context) {
        const result = await pool.query('SELECT * FROM claims WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            content: row.content,
            hash: row.hash,
            signature: row.signature,
            metadata: row.metadata,
            sourceRef: row.source_ref,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            createdAt: row.created_at,
        };
    },
    async claims(_, { limit = 50, offset = 0 }) {
        const result = await pool.query('SELECT * FROM claims ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows.map((row) => ({
            id: row.id,
            content: row.content,
            hash: row.hash,
            signature: row.signature,
            metadata: row.metadata,
            sourceRef: row.source_ref,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            createdAt: row.created_at,
        }));
    },
    async evidence(_, { id }) {
        const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            caseId: row.case_id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            checksumAlgorithm: row.checksum_algorithm,
            contentType: row.content_type,
            fileSize: row.file_size,
            transformChain: row.transform_chain,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            authorityId: row.authority_id,
            createdAt: row.created_at,
            metadata: row.metadata,
        };
    },
    async allEvidence(_, { limit = 50, offset = 0 }) {
        const result = await pool.query('SELECT * FROM evidence ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows.map((row) => ({
            id: row.id,
            caseId: row.case_id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            checksumAlgorithm: row.checksum_algorithm,
            contentType: row.content_type,
            fileSize: row.file_size,
            transformChain: row.transform_chain,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            authorityId: row.authority_id,
            createdAt: row.created_at,
            metadata: row.metadata,
        }));
    },
    async evidenceByCase(_, { caseId }) {
        const result = await pool.query(`SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`, [caseId]);
        return result.rows.map((row) => ({
            id: row.id,
            caseId: row.case_id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            checksumAlgorithm: row.checksum_algorithm,
            contentType: row.content_type,
            fileSize: row.file_size,
            transformChain: row.transform_chain,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            authorityId: row.authority_id,
            createdAt: row.created_at,
            metadata: row.metadata,
        }));
    },
    async provenanceChains(_, { claimId }) {
        const result = await pool.query('SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC', [claimId]);
        return result.rows.map((row) => ({
            id: row.id,
            claimId: row.claim_id,
            transforms: row.transforms,
            sources: row.sources,
            lineage: row.lineage,
            createdAt: row.created_at,
        }));
    },
    async case(_, { id }) {
        const result = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata,
        };
    },
    async cases(_, { limit = 50, offset = 0 }) {
        const result = await pool.query('SELECT * FROM cases ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        return result.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata,
        }));
    },
    async disclosureBundle(_, { caseId }) {
        // Verify case exists
        const caseResult = await pool.query('SELECT id FROM cases WHERE id = $1', [caseId]);
        if (caseResult.rows.length === 0) {
            throw new Error('Case not found');
        }
        // Get all evidence for the case
        const evidenceResult = await pool.query(`SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`, [caseId]);
        const evidence = evidenceResult.rows.map((row) => ({
            id: row.id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            transformChain: row.transform_chain,
        }));
        // Build hash tree
        const hashTree = evidenceResult.rows.map((row) => row.checksum);
        // Compute merkle root
        const merkleRoot = computeMerkleRoot(hashTree);
        return {
            caseId,
            version: '1.0',
            evidence,
            hashTree,
            merkleRoot,
            generatedAt: new Date().toISOString(),
        };
    },
    async exportManifest() {
        const claimsResult = await pool.query(`
      SELECT c.id, c.hash,
             COALESCE(array_agg(pc.transforms ORDER BY pc.created_at), ARRAY[]::jsonb[]) as transforms
      FROM claims c
      LEFT JOIN provenance_chains pc ON c.id = pc.claim_id
      GROUP BY c.id, c.hash
      ORDER BY c.created_at DESC
    `);
        const claims = claimsResult.rows.map((row) => ({
            id: row.id,
            hash: row.hash,
            transforms: row.transforms.filter((t) => t !== null),
        }));
        const hashChain = generateHash(claims.map((c) => c.hash).join(''));
        return {
            version: '1.0',
            claims,
            hashChain,
            generatedAt: new Date().toISOString(),
        };
    },
    async verifyTransformChain(_, { evidenceId }) {
        const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [evidenceId]);
        if (result.rows.length === 0) {
            throw new Error('Evidence not found');
        }
        const evidence = result.rows[0];
        const issues = [];
        let transformChainValid = true;
        let checksumValid = true;
        // Validate transform chain structure
        const transformChain = evidence.transform_chain;
        if (!Array.isArray(transformChain)) {
            transformChainValid = false;
            issues.push('Transform chain is not an array');
        }
        else {
            for (let i = 0; i < transformChain.length; i++) {
                const step = transformChain[i];
                if (!step.transformType) {
                    transformChainValid = false;
                    issues.push(`Transform step ${i} missing transformType`);
                }
                if (!step.timestamp) {
                    transformChainValid = false;
                    issues.push(`Transform step ${i} missing timestamp`);
                }
                if (!step.actorId) {
                    transformChainValid = false;
                    issues.push(`Transform step ${i} missing actorId`);
                }
            }
        }
        // Validate checksum format
        if (!evidence.checksum || evidence.checksum.length !== 64) {
            checksumValid = false;
            issues.push('Invalid checksum format (expected SHA-256)');
        }
        return {
            valid: transformChainValid && checksumValid,
            evidenceId,
            transformChainValid,
            checksumValid,
            issues,
            verifiedAt: new Date().toISOString(),
        };
    },
    async health() {
        try {
            await pool.query('SELECT 1');
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'healthy',
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                database: 'unhealthy',
            };
        }
    },
};
// ============================================================================
// Mutation Resolvers
// ============================================================================
const Mutation = {
    async createClaim(_, { input }, context) {
        const { content, signature, metadata, sourceRef, licenseId, policyLabels } = input;
        const id = generateClaimId();
        const hash = generateHash(content);
        const createdAt = new Date().toISOString();
        const result = await pool.query(`INSERT INTO claims (id, content, hash, signature, metadata, source_ref, license_id, policy_labels, created_at, authority_id, reason_for_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            id,
            JSON.stringify(content),
            hash,
            signature,
            JSON.stringify(metadata || {}),
            sourceRef,
            licenseId,
            JSON.stringify(policyLabels || []),
            createdAt,
            context.authorityId,
            context.reasonForAccess,
        ]);
        const row = result.rows[0];
        return {
            id: row.id,
            content: row.content,
            hash: row.hash,
            signature: row.signature,
            metadata: row.metadata,
            sourceRef: row.source_ref,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            createdAt: row.created_at,
        };
    },
    async createEvidence(_, { input }, context) {
        const { caseId, sourceRef, content, checksum: providedChecksum, checksumAlgorithm = 'sha256', contentType, fileSize, transformChain = [], licenseId, policyLabels = [], metadata, } = input;
        let checksum = providedChecksum;
        if (!checksum && content) {
            checksum = generateChecksum(content, checksumAlgorithm);
        }
        if (!checksum) {
            throw new Error('Either checksum or content must be provided');
        }
        const id = generateEvidenceId();
        const createdAt = new Date().toISOString();
        const result = await pool.query(`INSERT INTO evidence (id, case_id, source_ref, checksum, checksum_algorithm, content_type, file_size,
       transform_chain, license_id, policy_labels, authority_id, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`, [
            id,
            caseId || null,
            sourceRef,
            checksum,
            checksumAlgorithm,
            contentType || null,
            fileSize || null,
            JSON.stringify(transformChain),
            licenseId || null,
            JSON.stringify(policyLabels),
            context.authorityId,
            createdAt,
            JSON.stringify(metadata || {}),
        ]);
        // Link to case if caseId provided
        if (caseId) {
            await pool.query(`INSERT INTO case_evidence (case_id, evidence_id, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`, [caseId, id, context.authorityId]);
        }
        const row = result.rows[0];
        return {
            id: row.id,
            caseId: row.case_id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            checksumAlgorithm: row.checksum_algorithm,
            contentType: row.content_type,
            fileSize: row.file_size,
            transformChain: row.transform_chain,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            authorityId: row.authority_id,
            createdAt: row.created_at,
            metadata: row.metadata,
        };
    },
    async createProvenanceChain(_, { input }, context) {
        const { claimId, transforms, sources, lineage } = input;
        const id = generateProvenanceId();
        const createdAt = new Date().toISOString();
        const result = await pool.query(`INSERT INTO provenance_chains (id, claim_id, transforms, sources, lineage, created_at, authority_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            id,
            claimId,
            JSON.stringify(transforms),
            JSON.stringify(sources),
            JSON.stringify(lineage),
            createdAt,
            context.authorityId,
        ]);
        const row = result.rows[0];
        return {
            id: row.id,
            claimId: row.claim_id,
            transforms: row.transforms,
            sources: row.sources,
            lineage: row.lineage,
            createdAt: row.created_at,
        };
    },
    async createCase(_, { input }, context) {
        const { title, description, status = 'active', metadata } = input;
        const id = generateCaseId();
        const createdAt = new Date().toISOString();
        const result = await pool.query(`INSERT INTO cases (id, title, description, status, created_by, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [
            id,
            title,
            description,
            status,
            context.authorityId,
            createdAt,
            createdAt,
            JSON.stringify(metadata || {}),
        ]);
        const row = result.rows[0];
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata,
        };
    },
    async verifyHash(_, { input }) {
        const { content, expectedHash } = input;
        const actualHash = generateHash(content);
        const isValid = actualHash === expectedHash;
        return {
            valid: isValid,
            expectedHash,
            actualHash,
            verifiedAt: new Date().toISOString(),
        };
    },
};
// ============================================================================
// Field Resolvers
// ============================================================================
const Claim = {
    async provenanceChains(parent) {
        const result = await pool.query('SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC', [parent.id]);
        return result.rows.map((row) => ({
            id: row.id,
            claimId: row.claim_id,
            transforms: row.transforms,
            sources: row.sources,
            lineage: row.lineage,
            createdAt: row.created_at,
        }));
    },
    async license(parent) {
        if (!parent.licenseId)
            return null;
        const result = await pool.query('SELECT * FROM licenses WHERE id = $1', [parent.licenseId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            claimId: row.claim_id,
            licenseType: row.license_type,
            licenseText: row.license_text,
            terms: row.terms,
            restrictions: row.restrictions,
            attributionRequired: row.attribution_required,
            commercialUseAllowed: row.commercial_use_allowed,
            createdAt: row.created_at,
        };
    },
};
const Evidence = {
    async license(parent) {
        if (!parent.licenseId)
            return null;
        const result = await pool.query('SELECT * FROM licenses WHERE id = $1', [parent.licenseId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            claimId: row.claim_id,
            licenseType: row.license_type,
            licenseText: row.license_text,
            terms: row.terms,
            restrictions: row.restrictions,
            attributionRequired: row.attribution_required,
            commercialUseAllowed: row.commercial_use_allowed,
            createdAt: row.created_at,
        };
    },
    async case(parent) {
        if (!parent.caseId)
            return null;
        const result = await pool.query('SELECT * FROM cases WHERE id = $1', [parent.caseId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata,
        };
    },
};
const ProvenanceChain = {
    async claim(parent) {
        const result = await pool.query('SELECT * FROM claims WHERE id = $1', [parent.claimId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            content: row.content,
            hash: row.hash,
            signature: row.signature,
            metadata: row.metadata,
            sourceRef: row.source_ref,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            createdAt: row.created_at,
        };
    },
};
const Case = {
    async evidence(parent) {
        const result = await pool.query(`SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`, [parent.id]);
        return result.rows.map((row) => ({
            id: row.id,
            caseId: row.case_id,
            sourceRef: row.source_ref,
            checksum: row.checksum,
            checksumAlgorithm: row.checksum_algorithm,
            contentType: row.content_type,
            fileSize: row.file_size,
            transformChain: row.transform_chain,
            licenseId: row.license_id,
            policyLabels: row.policy_labels || [],
            authorityId: row.authority_id,
            createdAt: row.created_at,
            metadata: row.metadata,
        }));
    },
    async disclosureBundle(parent) {
        // Reuse the query logic
        return Query.disclosureBundle(null, { caseId: parent.id });
    },
};
// ============================================================================
// Export Resolvers
// ============================================================================
exports.resolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    Query,
    Mutation,
    Claim,
    Evidence,
    ProvenanceChain,
    Case,
};
