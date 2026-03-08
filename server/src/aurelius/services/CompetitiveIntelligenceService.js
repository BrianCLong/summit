"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompetitiveIntelligenceService = void 0;
const database_js_1 = require("../../config/database.js");
class CompetitiveIntelligenceService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!CompetitiveIntelligenceService.instance) {
            CompetitiveIntelligenceService.instance = new CompetitiveIntelligenceService();
        }
        return CompetitiveIntelligenceService.instance;
    }
    async addCompetitor(name, type, tenantId) {
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            await session.run(`
            MERGE (c:CompetitiveEntity {name: $name, tenantId: $tenantId})
            SET c.type = $type, c:AureliusNode
          `, { name, type, tenantId });
        }
        finally {
            await session.close();
        }
    }
    async getMarketMap(tenantId) {
        // Return a graph of competitors and their patent clusters
        const driver = (0, database_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            const result = await session.run(`
            MATCH (c:CompetitiveEntity {tenantId: $tenantId})
            OPTIONAL MATCH (c)-[:OWNS]->(p:Patent)
            OPTIONAL MATCH (p)-[:BELONGS_TO]->(cluster:PriorArtCluster)
            RETURN c.name as competitor, count(p) as patentCount, collect(distinct cluster.name) as domains
          `, { tenantId });
            return result.records.map((r) => ({
                competitor: r.get('competitor'),
                patentCount: r.get('patentCount').toNumber(),
                domains: r.get('domains')
            }));
        }
        finally {
            await session.close();
        }
    }
}
exports.CompetitiveIntelligenceService = CompetitiveIntelligenceService;
