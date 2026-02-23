import { Driver, Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';
import { AudienceSegment, CognitiveState, ExposureInput } from '../cognitive-security/types.js';
import { v4 as uuidv4 } from 'uuid';

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
        
        // Recalculate segment resilience and belief state
        WITH s
        MATCH (s)-[rel:ADOPTS]->(n:Narrative)
        WITH s, 
             collect({topic: n.id, strength: rel.strength}) as beliefNodes,
             avg(rel.strength) as avgBelief, 
             count(rel) as beliefCount,
             stDev(rel.strength) as beliefVolatility
        
        //Entropy-based resilience: diversity of belief + stability
        SET s.resilienceScore = CASE 
            WHEN beliefCount > 0 THEN 
                1.0 - (avgBelief * 0.4) - (COALESCE(beliefVolatility, 0) * 0.2)
            ELSE 0.5
          END,
          s.beliefVector = apoc.map.fromPairs([b IN beliefNodes | [b.topic, b.strength]]),
          s.updatedAt = datetime()
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
     * Records a specific cognitive effect/exposure incident for an audience.
     */
    async recordCognitiveEffect(exposure: ExposureInput, tenantId?: string): Promise<CognitiveState> {
        const session: Session = this.driver.session();
        const id = uuidv4();
        try {
            // 1. Create the incident node
            // 2. Update the segment's current state (valence, arousal)
            // 3. Link incident to segment and narrative
            const query = `
                MATCH (s:AudienceSegment {id: $segmentId})
                ${tenantId ? 'WHERE s.tenantId = $tenantId' : ''}
                MATCH (n:Narrative {id: $narrativeId})
                
                CREATE (cs:CognitiveState {
                    id: $id,
                    segmentId: $segmentId,
                    narrativeId: $narrativeId,
                    timestamp: datetime($timestamp),
                    sentimentShift: $sentimentShift,
                    reactionType: $reactionType,
                    tenantId: $tenantId
                })
                CREATE (s)-[:EXPERIENCED]->(cs)
                CREATE (cs)-[:OF_NARRATIVE]->(n)
                
                // Update running averages for segment mood
                WITH s, cs
                SET s.emotionalValence = COALESCE(s.emotionalValence, 0.0) + ($sentimentShift * 0.1),
                    s.arousalLevel = CASE 
                        WHEN $reactionType IN ['ANGRY', 'ALARMED', 'EXCITED'] THEN LEAST(1.0, COALESCE(s.arousalLevel, 0.0) + 0.1)
                        ELSE GREATEST(0.0, COALESCE(s.arousalLevel, 0.0) - 0.05)
                    END
                
                RETURN cs.id as id, cs.segmentId as segmentId, cs.timestamp as timestamp,
                       s.resilienceScore as resilienceScore, s.emotionalValence as emotionalValence,
                       s.arousalLevel as arousalLevel, s.beliefVector as beliefVector
            `;

            const result = await session.run(query, {
                id,
                segmentId: exposure.segmentId,
                narrativeId: exposure.narrativeId,
                timestamp: exposure.timestamp,
                sentimentShift: exposure.sentimentShift || 0,
                reactionType: exposure.reactionType || 'NEUTRAL',
                tenantId
            });

            if (result.records.length === 0) {
                throw new Error(`Failed to record cognitive effect: Segment ${exposure.segmentId} or Narrative ${exposure.narrativeId} not found.`);
            }

            const record = result.records[0];
            return {
                id: record.get('id'),
                segmentId: record.get('segmentId'),
                timestamp: record.get('timestamp').toString(),
                beliefVector: record.get('beliefVector') || {},
                resilienceScore: record.get('resilienceScore') || 0.5,
                emotionalValence: record.get('emotionalValence') || 0.0,
                arousalLevel: record.get('arousalLevel') || 0.0
            };
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
