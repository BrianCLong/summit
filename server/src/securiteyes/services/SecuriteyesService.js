"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecuriteyesService = void 0;
const neo4j_js_1 = require("../../graph/neo4j.js");
const types_js_1 = require("../models/types.js");
const crypto_1 = require("crypto");
class SecuriteyesService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SecuriteyesService.instance) {
            SecuriteyesService.instance = new SecuriteyesService();
        }
        return SecuriteyesService.instance;
    }
    // --- Generic Node Creation ---
    async createNode(label, data) {
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const props = {
            ...data,
            id,
            createdAt: now,
            updatedAt: now,
        };
        const query = `
      CREATE (n:${label} $props)
      RETURN n
    `;
        const result = await (0, neo4j_js_1.runCypher)(query, { props });
        if (!result || result.length === 0) {
            throw new Error(`Failed to create node of label ${label}`);
        }
        return result[0].n.properties;
    }
    // --- Generic Edge Creation ---
    async createRelationship(fromId, toId, relationshipType, props = {}) {
        // Assuming generic matching on IDs across all labels for simplicity,
        // but in practice might want to specify labels for performance.
        const query = `
      MATCH (a), (b)
      WHERE a.id = $fromId AND b.id = $toId
      MERGE (a)-[r:${relationshipType}]->(b)
      SET r += $props, r.createdAt = datetime()
      RETURN r
    `;
        await (0, neo4j_js_1.runCypher)(query, { fromId, toId, props });
    }
    // --- Specific Entity Methods ---
    async createSuspiciousEvent(data) {
        return this.createNode(types_js_1.NODE_LABELS.SUSPICIOUS_EVENT, data);
    }
    async createIndicator(data) {
        // Check if indicator exists first to avoid duplicates
        const checkQuery = `
      MATCH (n:${types_js_1.NODE_LABELS.INDICATOR} { value: $value, tenantId: $tenantId })
      RETURN n
    `;
        const existing = await (0, neo4j_js_1.runCypher)(checkQuery, { value: data.value, tenantId: data.tenantId });
        if (existing.length > 0) {
            return existing[0].n.properties;
        }
        return this.createNode(types_js_1.NODE_LABELS.INDICATOR, data);
    }
    async createCampaign(data) {
        return this.createNode(types_js_1.NODE_LABELS.CAMPAIGN, data);
    }
    async createThreatActor(data) {
        return this.createNode(types_js_1.NODE_LABELS.THREAT_ACTOR, data);
    }
    async createIncident(data) {
        return this.createNode(types_js_1.NODE_LABELS.INCIDENT, data);
    }
    async createDeceptionAsset(data) {
        return this.createNode(types_js_1.NODE_LABELS.DECEPTION_ASSET, data);
    }
    // --- Risk Profile ---
    async getOrCreateRiskProfile(principalId, tenantId) {
        const query = `
      MERGE (n:${types_js_1.NODE_LABELS.INSIDER_RISK_PROFILE} { principalId: $principalId, tenantId: $tenantId })
      ON CREATE SET
        n.id = $id,
        n.createdAt = datetime(),
        n.updatedAt = datetime(),
        n.riskScore = 0,
        n.riskFactors = '{}'
      RETURN n
    `;
        const result = await (0, neo4j_js_1.runCypher)(query, { principalId, tenantId, id: (0, crypto_1.randomUUID)() });
        const profile = result[0].n.properties;
        // Parse riskFactors if it comes back as string (depending on Neo4j driver serialization)
        if (typeof profile.riskFactors === 'string') {
            profile.riskFactors = JSON.parse(profile.riskFactors);
        }
        return profile;
    }
    async updateRiskScore(principalId, tenantId, score, factors) {
        const query = `
      MATCH (n:${types_js_1.NODE_LABELS.INSIDER_RISK_PROFILE} { principalId: $principalId, tenantId: $tenantId })
      SET n.riskScore = $score, n.riskFactors = $factors, n.updatedAt = datetime()
    `;
        // Serialize factors for Neo4j if complex object
        await (0, neo4j_js_1.runCypher)(query, { principalId, tenantId, score, factors: JSON.stringify(factors) });
    }
    // --- Retrieval & Search ---
    async getRecentSuspiciousEvents(tenantId, limit = 50) {
        const query = `
      MATCH (n:${types_js_1.NODE_LABELS.SUSPICIOUS_EVENT} { tenantId: $tenantId })
      RETURN n
      ORDER BY n.createdAt DESC
      LIMIT toInteger($limit)
    `;
        const res = await (0, neo4j_js_1.runCypher)(query, { tenantId, limit });
        return res.map((r) => r.n.properties);
    }
    async getActiveIncidents(tenantId) {
        const query = `
      MATCH (n:${types_js_1.NODE_LABELS.INCIDENT} { tenantId: $tenantId })
      WHERE n.status <> 'recovered' AND n.status <> 'lessons_learned'
      RETURN n
      ORDER BY n.createdAt DESC
    `;
        const res = await (0, neo4j_js_1.runCypher)(query, { tenantId });
        return res.map((r) => r.n.properties);
    }
    async getCampaigns(tenantId) {
        const query = `
        MATCH (n:${types_js_1.NODE_LABELS.CAMPAIGN} { tenantId: $tenantId })
        RETURN n
        ORDER BY n.updatedAt DESC
      `;
        const res = await (0, neo4j_js_1.runCypher)(query, { tenantId });
        return res.map((r) => r.n.properties);
    }
    async getThreatActors(tenantId) {
        const query = `
        MATCH (n:${types_js_1.NODE_LABELS.THREAT_ACTOR} { tenantId: $tenantId })
        RETURN n
        ORDER BY n.confidence DESC
      `;
        const res = await (0, neo4j_js_1.runCypher)(query, { tenantId });
        return res.map((r) => r.n.properties);
    }
    async getHighRiskProfiles(tenantId, threshold) {
        const query = `
          MATCH (n:${types_js_1.NODE_LABELS.INSIDER_RISK_PROFILE} { tenantId: $tenantId })
          WHERE n.riskScore >= $threshold
          RETURN n
          ORDER BY n.riskScore DESC
      `;
        const res = await (0, neo4j_js_1.runCypher)(query, { tenantId, threshold });
        return res.map((r) => {
            const profile = r.n.properties;
            if (typeof profile.riskFactors === 'string') {
                try {
                    profile.riskFactors = JSON.parse(profile.riskFactors);
                }
                catch { }
            }
            return profile;
        });
    }
}
exports.SecuriteyesService = SecuriteyesService;
