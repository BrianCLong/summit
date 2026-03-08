"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveStateService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class CognitiveStateService {
    driver;
    static instance;
    constructor() {
        this.driver = (0, database_js_1.getNeo4jDriver)();
    }
    static getInstance() {
        if (!CognitiveStateService.instance) {
            CognitiveStateService.instance = new CognitiveStateService();
        }
        return CognitiveStateService.instance;
    }
    /**
     * Tracks/Updates the cognitive state of an audience segment based on new narrative ingestion.
     */
    async updateSegmentState(segmentId, narrativeId, strength, certainty, tenantId) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (s:AudienceSegment {id: $segmentId})
        ${tenantId ? 'WHERE s.tenantId = $tenantId' : ''}
        MERGE (n:Narrative {id: $narrativeId})
        MERGE (s)-[r:ADOPTS]->(n)
        SET r.strength = $strength,
            r.certainty = $certainty,
            r.updatedAt = datetime()
        
        // Recalculate segment resilience based on belief entropy
        WITH s
        MATCH (s)-[rel:ADOPTS]->()
        WITH s, avg(rel.strength) as avgBelief, count(rel) as beliefCount
        SET s.resilienceScore = CASE 
            WHEN beliefCount > 5 THEN 1.0 - (avgBelief * 0.5) // Higher diverse beliefs = more resilient
            ELSE 0.5
          END
      `;
            await session.run(query, { segmentId, narrativeId, strength, certainty, tenantId });
            logger_js_1.default.info({ segmentId, narrativeId }, 'CognitiveStateService: Updated segment state');
        }
        catch (error) {
            logger_js_1.default.error({ segmentId, error: error.message }, 'CognitiveStateService: Failed to update segment');
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Retrieves the current cognitive state for a segment.
     */
    async getSegmentState(segmentId, tenantId) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (s:AudienceSegment {id: $segmentId})
        ${tenantId ? 'WHERE s.tenantId = $tenantId' : ''}
        OPTIONAL MATCH (s)-[r:ADOPTS]->(n:Narrative)
        RETURN s.id as id, s.name as name, s.description as description, s.size as size,
               s.resilienceScore as resilienceScore, s.trustInInstitutions as trustInInstitutions,
               s.polarizationIndex as polarizationIndex, s.fearSensitivity as fearSensitivity,
               s.identityClusters as identityClusters, s.createdAt as createdAt, s.updatedAt as updatedAt,
               collect(n.id) as narrativeIds
      `;
            const result = await session.run(query, { segmentId, tenantId });
            if (result.records.length === 0)
                return null;
            const record = result.records[0];
            return {
                id: record.get('id'),
                name: record.get('name') || record.get('label') || 'Unknown',
                description: record.get('description') || '',
                size: record.get('size')?.toNumber() || 0,
                resilienceScore: record.get('resilienceScore') || 0.5,
                regions: [], // Placeholder
                vulnerabilityFactors: [], // Placeholder
                narrativeIds: record.get('narrativeIds').filter((id) => id !== null),
                trustInInstitutions: record.get('trustInInstitutions') || 0.5,
                polarizationIndex: record.get('polarizationIndex') || 0.5,
                fearSensitivity: record.get('fearSensitivity') || 0.5,
                identityClusters: record.get('identityClusters') || [],
                createdAt: record.get('createdAt') || new Date().toISOString(),
                updatedAt: record.get('updatedAt') || new Date().toISOString()
            };
        }
        finally {
            await session.close();
        }
    }
}
exports.CognitiveStateService = CognitiveStateService;
