import { Driver, Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';
import { AudienceSegment, CognitiveState } from '../cognitive-security/types.js';

export class CognitiveStateService {
    private driver: Driver;
    private static instance: CognitiveStateService;

    private constructor() {
        this.driver = getNeo4jDriver();
    }

    public static getInstance(): CognitiveStateService {
        if (!CognitiveStateService.instance) {
            CognitiveStateService.instance = new CognitiveStateService();
        }
        return CognitiveStateService.instance;
    }

    /**
     * Tracks/Updates the cognitive state of an audience segment based on new narrative ingestion.
     */
    async updateSegmentState(
        segmentId: string,
        narrativeId: string,
        strength: number,
        certainty: number,
        tenantId?: string
    ): Promise<void> {
        const session: Session = this.driver.session();
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
            logger.info({ segmentId, narrativeId }, 'CognitiveStateService: Updated segment state');
        } catch (error) {
            logger.error({ segmentId, error: (error as Error).message }, 'CognitiveStateService: Failed to update segment');
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Retrieves the current cognitive state for a segment.
     */
    async getSegmentState(segmentId: string, tenantId?: string): Promise<AudienceSegment | null> {
        const session: Session = this.driver.session();
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
            if (result.records.length === 0) return null;

            const record = result.records[0];
            return {
                id: record.get('id'),
                name: record.get('name') || record.get('label') || 'Unknown',
                description: record.get('description') || '',
                size: record.get('size')?.toNumber() || 0,
                resilienceScore: record.get('resilienceScore') || 0.5,
                regions: [], // Placeholder
                vulnerabilityFactors: [], // Placeholder
                narrativeIds: record.get('narrativeIds').filter((id: any) => id !== null),
                trustInInstitutions: record.get('trustInInstitutions') || 0.5,
                polarizationIndex: record.get('polarizationIndex') || 0.5,
                fearSensitivity: record.get('fearSensitivity') || 0.5,
                identityClusters: record.get('identityClusters') || [],
                createdAt: record.get('createdAt') || new Date().toISOString(),
                updatedAt: record.get('updatedAt') || new Date().toISOString()
            };
        } finally {
            await session.close();
        }
    }
}
