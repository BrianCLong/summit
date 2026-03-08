"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionRepo = void 0;
/**
 * Repository for storing and managing Decision nodes in Neo4j
 */
class DecisionRepo {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create or update a Decision node
     */
    async upsertDecision(decision) {
        const session = this.driver.session();
        try {
            const res = await session.executeWrite((tx) => tx.run(`MERGE (d:Decision {title: $title, context: $context})
           ON CREATE SET
             d.id = randomUUID(),
             d.createdAt = timestamp(),
             d.updatedAt = timestamp(),
             d.description = $description,
             d.options = $options,
             d.selectedOption = $selectedOption,
             d.rationale = $rationale,
             d.reversible = $reversible,
             d.status = $status,
             d.decidedBy = $decidedBy,
             d.decidedAt = $decidedAt,
             d.approvedBy = $approvedBy,
             d.policyLabels = $policyLabels,
             d.risks = $risks,
             d.owners = $owners,
             d.checks = $checks,
             d.tags = $tags,
             d.properties = $properties
           ON MATCH SET
             d.updatedAt = timestamp(),
             d.description = $description,
             d.options = $options,
             d.selectedOption = $selectedOption,
             d.rationale = $rationale,
             d.reversible = $reversible,
             d.status = $status,
             d.decidedBy = $decidedBy,
             d.decidedAt = $decidedAt,
             d.approvedBy = $approvedBy,
             d.policyLabels = $policyLabels,
             d.risks = $risks,
             d.owners = $owners,
             d.checks = $checks,
             d.tags = $tags,
             d.properties = $properties
           RETURN d`, {
                ...decision,
                options: JSON.stringify(decision.options || []),
                approvedBy: JSON.stringify(decision.approvedBy || []),
                policyLabels: JSON.stringify(decision.policyLabels),
                risks: JSON.stringify(decision.risks || []),
                owners: JSON.stringify(decision.owners || []),
                checks: JSON.stringify(decision.checks || []),
                tags: JSON.stringify(decision.tags || []),
                properties: JSON.stringify(decision.properties || {}),
                context: JSON.stringify(decision.context),
                decidedBy: JSON.stringify(decision.decidedBy || null),
            }));
            const node = res.records[0]?.get('d');
            return node ? this.nodeToDecision(node) : {};
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get Decision by ID
     */
    async getDecisionById(id) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (d:Decision {id: $id}) RETURN d`, { id }));
            const node = res.records[0]?.get('d');
            return node ? this.nodeToDecision(node) : null;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Link Evidence to a Decision
     */
    async linkEvidence(decisionId, evidenceIds) {
        const session = this.driver.session();
        try {
            await session.executeWrite((tx) => tx.run(`MATCH (d:Decision {id: $decisionId})
           UNWIND $evidenceIds as evidenceId
           MATCH (e:Evidence {id: evidenceId})
           MERGE (d)-[:SUPPORTED_BY]->(e)`, { decisionId, evidenceIds }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Link Claims to a Decision
     */
    async linkClaims(decisionId, claimIds) {
        const session = this.driver.session();
        try {
            await session.executeWrite((tx) => tx.run(`MATCH (d:Decision {id: $decisionId})
           UNWIND $claimIds as claimId
           MATCH (c:Claim {id: claimId})
           MERGE (d)-[:BASED_ON]->(c)`, { decisionId, claimIds }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all Evidence linked to a Decision
     */
    async getLinkedEvidence(decisionId) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (d:Decision {id: $decisionId})-[:SUPPORTED_BY]->(e:Evidence)
           RETURN e`, { decisionId }));
            return res.records.map((r) => this.parseJsonFields(r.get('e').properties));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all Claims linked to a Decision
     */
    async getLinkedClaims(decisionId) {
        const session = this.driver.session();
        try {
            const res = await session.executeRead((tx) => tx.run(`MATCH (d:Decision {id: $decisionId})-[:BASED_ON]->(c:Claim)
           RETURN c`, { decisionId }));
            return res.records.map((r) => this.parseJsonFields(r.get('c').properties));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Search Decisions
     */
    async searchDecisions(query, filter, limit = 25, offset = 0) {
        const session = this.driver.session();
        try {
            let cypherQuery = `
        MATCH (d:Decision)
        WHERE toLower(d.title) CONTAINS toLower($query)
           OR toLower(d.description) CONTAINS toLower($query)
      `;
            const params = { query, limit, offset };
            if (filter?.status) {
                cypherQuery += ' AND d.status IN $status';
                params.status = Array.isArray(filter.status) ? filter.status : [filter.status];
            }
            if (filter?.tags) {
                cypherQuery += ' AND ANY(tag IN $tags WHERE tag IN d.tags)';
                params.tags = Array.isArray(filter.tags) ? filter.tags : [filter.tags];
            }
            cypherQuery += `
        RETURN d
        ORDER BY d.createdAt DESC
        SKIP $offset
        LIMIT $limit
      `;
            const res = await session.executeRead((tx) => tx.run(cypherQuery, params));
            return res.records.map((r) => this.nodeToDecision(r.get('d')));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Update Decision status
     */
    async updateStatus(id, status) {
        const session = this.driver.session();
        try {
            const res = await session.executeWrite((tx) => tx.run(`MATCH (d:Decision {id: $id})
           SET d.status = $status, d.updatedAt = timestamp()
           RETURN d`, { id, status }));
            const node = res.records[0]?.get('d');
            return node ? this.nodeToDecision(node) : null;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Convert Neo4j Node to Decision
     */
    nodeToDecision(node) {
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
            context: this.safeJsonParse(props.context),
            options: this.safeJsonParse(props.options),
            selectedOption: props.selectedOption,
            rationale: props.rationale,
            reversible: props.reversible,
            status: props.status,
            decidedBy: this.safeJsonParse(props.decidedBy),
            decidedAt: props.decidedAt,
            approvedBy: this.safeJsonParse(props.approvedBy),
            policyLabels: this.safeJsonParse(props.policyLabels),
            risks: this.safeJsonParse(props.risks),
            owners: this.safeJsonParse(props.owners),
            checks: this.safeJsonParse(props.checks),
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
exports.DecisionRepo = DecisionRepo;
exports.default = DecisionRepo;
