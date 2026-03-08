"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceRepo = void 0;
/**
 * Repository for storing and managing Evidence nodes in Neo4j
 */
class EvidenceRepo {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create or update an Evidence node
     */
    async upsertEvidence(evidence) {
        const session = this.driver.session();
        try {
            const res = await session.executeWrite((tx) => tx.run(`MERGE (e:Evidence {title: $title, evidenceType: $evidenceType})
           ON CREATE SET
             e.id = randomUUID(),
             e.createdAt = timestamp(),
             e.updatedAt = timestamp(),
             e.description = $description,
             e.sources = $sources,
             e.blobs = $blobs,
             e.policyLabels = $policyLabels,
             e.context = $context,
             e.verification = $verification,
             e.tags = $tags,
             e.properties = $properties
           ON MATCH SET
             e.updatedAt = timestamp(),
             e.description = $description,
             e.sources = $sources,
             e.blobs = $blobs,
             e.policyLabels = $policyLabels,
             e.context = $context,
             e.verification = $verification,
             e.tags = $tags,
             e.properties = $properties
           RETURN e`, {
                ...evidence,
                sources: JSON.stringify(evidence.sources),
                blobs: JSON.stringify(evidence.blobs),
                policyLabels: JSON.stringify(evidence.policyLabels),
                context: JSON.stringify(evidence.context || null),
                verification: JSON.stringify(evidence.verification || null),
                tags: JSON.stringify(evidence.tags || []),
                properties: JSON.stringify(evidence.properties || {}),
            }));
            const node = res.records[0]?.get('e');
            return node ? this.nodeToEvidence(node) : {};
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get Evidence by ID
     */
    async getEvidenceById(id) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (e:Evidence {id: $id}) RETURN e`, { id }));
            const node = res.records[0]?.get('e');
            return node ? this.nodeToEvidence(node) : null;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Link Evidence to a Claim (evidence supports claim)
     */
    async linkToClaim(evidenceId, claimId, weight = 1.0) {
        const session = this.driver.session();
        try {
            await session.executeWrite((tx) => tx.run(`MATCH (e:Evidence {id: $evidenceId}), (c:Claim {id: $claimId})
           MERGE (e)-[r:SUPPORTS]->(c)
           SET r.weight = $weight`, { evidenceId, claimId, weight }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all Claims supported by this Evidence
     */
    async getLinkedClaims(evidenceId) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (e:Evidence {id: $evidenceId})-[:SUPPORTS]->(c:Claim)
           RETURN c`, { evidenceId }));
            return res.records.map((r) => this.parseJsonFields(r.get('c').properties));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Search Evidence
     */
    async searchEvidence(query, filter, limit = 25, offset = 0) {
        const session = this.driver.session();
        try {
            let cypherQuery = `
        MATCH (e:Evidence)
        WHERE toLower(e.title) CONTAINS toLower($query)
           OR toLower(e.description) CONTAINS toLower($query)
      `;
            const params = { query, limit, offset };
            if (filter?.evidenceType) {
                cypherQuery += ' AND e.evidenceType IN $evidenceType';
                params.evidenceType = Array.isArray(filter.evidenceType)
                    ? filter.evidenceType
                    : [filter.evidenceType];
            }
            if (filter?.tags) {
                cypherQuery += ' AND ANY(tag IN $tags WHERE tag IN e.tags)';
                params.tags = Array.isArray(filter.tags) ? filter.tags : [filter.tags];
            }
            cypherQuery += `
        RETURN e
        ORDER BY e.createdAt DESC
        SKIP $offset
        LIMIT $limit
      `;
            const res = await session.executeRead((tx) => tx.run(cypherQuery, params));
            return res.records.map((r) => this.nodeToEvidence(r.get('e')));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get Evidence by context (e.g., case ID, investigation ID, maestro run ID)
     */
    async getByContext(contextKey, contextValue) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (e:Evidence)
           WHERE e.context IS NOT NULL
           AND e.context CONTAINS $contextValue
           RETURN e`, { contextValue }));
            return res.records.map((r) => this.nodeToEvidence(r.get('e')));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Convert Neo4j Node to Evidence
     */
    nodeToEvidence(node) {
        const props = node.properties;
        return this.parseJsonFields(props);
    }
    /**
     * Parse JSON string fields back to objects
     */
    parseJsonFields(props) {
        return {
            id: props.id,
            title: props.title,
            description: props.description,
            evidenceType: props.evidenceType,
            sources: this.safeJsonParse(props.sources),
            blobs: this.safeJsonParse(props.blobs),
            policyLabels: this.safeJsonParse(props.policyLabels),
            context: this.safeJsonParse(props.context),
            verification: this.safeJsonParse(props.verification),
            tags: this.safeJsonParse(props.tags),
            properties: this.safeJsonParse(props.properties),
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
        };
    }
    /**
     * Safely parse JSON strings
     */
    safeJsonParse(value) {
        if (value === null || value === undefined) {
            return undefined;
        }
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        return value;
    }
}
exports.EvidenceRepo = EvidenceRepo;
exports.default = EvidenceRepo;
