"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeDetectionService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class CascadeDetectionService {
    driver;
    static instance;
    constructor() {
        this.driver = (0, database_js_1.getNeo4jDriver)();
    }
    static getInstance() {
        if (!CascadeDetectionService.instance) {
            CascadeDetectionService.instance = new CascadeDetectionService();
        }
        return CascadeDetectionService.instance;
    }
    /**
     * Scans the graph for narrative cascades originating from a specific source.
     */
    async detectCascades(narrativeId, tenantId) {
        const session = this.driver.session();
        try {
            // Find paths and identify the earliest promoter (origin actor)
            const query = `
        MATCH (n:Narrative {id: $narrativeId})
        ${tenantId ? 'WHERE n.tenantId = $tenantId' : ''}
        
        // Find the origin actor
        OPTIONAL MATCH (origin:Entity)-[r0:PROMOTES]->(n)
        WITH n, origin, r0.timestamp as originTime
        ORDER BY originTime ASC
        WITH n, head(collect(origin)) as originActor, head(collect(r0)) as originRel
        
        // Find the full propagation path
        MATCH path = (n)<-[:PROMOTES|ADOPTS|SHARES*1..5]-(actor:Entity)
        
        WITH n, originActor, originRel, actor, path, length(path) as hops
        WHERE hops > 0
        
        RETURN 
          $narrativeId as narrativeId,
          originActor.id as originActorId,
          originRel.timestamp as startTime,
          collect(actor.id) as reachNodes,
          count(distinct actor) as reachCount,
          max(hops) as maxDepth,
          avg(hops) as avgHops
      `;
            const result = await session.run(query, { narrativeId, tenantId });
            const cascades = result.records.map((record) => ({
                id: `cascade-${narrativeId}-${Date.now()}`,
                narrativeId: record.get('narrativeId'),
                startTime: record.get('startTime')?.toString() || new Date().toISOString(),
                originNodeId: record.get('originActorId') || 'unknown',
                originActorId: record.get('originActorId'),
                totalHops: Math.floor((record.get('avgHops') || 0) * (record.get('reachCount')?.toNumber() || 1)),
                maxDepth: record.get('maxDepth')?.toNumber() || 0,
                uniqueActors: record.get('reachCount')?.toNumber() || 0,
                velocity: record.get('reachCount')?.toNumber() / (Math.max(1, record.get('avgHops')?.toNumber() || 1)),
                viralityScore: (record.get('reachCount')?.toNumber() || 0) / 100.0,
                hopIds: []
            }));
            return cascades;
        }
        catch (error) {
            logger_js_1.default.error({ narrativeId, error: error.message }, 'CascadeDetectionService: Scans failed');
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Identifies "Hub" nodes that are critical to the cascade propagation.
     */
    async identifyAmplificationHubs(narrativeId, tenantId) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (n:Narrative {id: $narrativeId})
        ${tenantId ? 'WHERE n.tenantId = $tenantId' : ''}
        MATCH (actor:Entity)-[r:PROMOTES|SHARES]->(n)
        WITH actor, count(r) as promoCount
        ORDER BY promoCount DESC
        LIMIT 10
        RETURN actor.id as id, actor.label as label, promoCount as score
      `;
            const result = await session.run(query, { narrativeId, tenantId });
            return result.records.map((r) => ({
                id: r.get('id'),
                label: r.get('label'),
                score: r.get('score').toNumber()
            }));
        }
        finally {
            await session.close();
        }
    }
}
exports.CascadeDetectionService = CascadeDetectionService;
