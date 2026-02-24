import { Driver, Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';
import { TippingPointIndicator } from '../cognitive-security/types.js';
import { v4 as uuidv4 } from 'uuid';

export class EarlyWarningService {
    private driver: Driver;
    private static instance: EarlyWarningService;

    private constructor() {
        this.driver = getNeo4jDriver();
    }

    public static getInstance(): EarlyWarningService {
        if (!EarlyWarningService.instance) {
            EarlyWarningService.instance = new EarlyWarningService();
        }
        return EarlyWarningService.instance;
    }

    /**
     * Checks current graph metrics against defined thresholds to detect tipping points for a narrative.
     */
    async checkTippingPoints(narrativeId: string, tenantId?: string): Promise<TippingPointIndicator[]> {
        const session: Session = this.driver.session();
        try {
            // Check for tipping points based on narrative velocity, reach, and arousal levels of segments
            const query = `
                MATCH (n:Narrative {id: $narrativeId})
                ${tenantId ? 'WHERE n.tenantId = $tenantId' : ''}
                
                // Calculate velocity and reach
                OPTIONAL MATCH (n)<-[:PROMOTES|ADOPTS|SHARES]-(actor:Entity)
                WITH n, count(distinct actor) as currentReach
                
                // Get audience arousal for segments exposed to this narrative
                OPTIONAL MATCH (s:AudienceSegment)-[:EXPERIENCED]->(:CognitiveState)-[:OF_NARRATIVE]->(n)
                WITH n, currentReach, avg(s.arousalLevel) as avgArousal, collect(distinct s) as segments
                
                // Return metric values to evaluate
                RETURN 
                    $narrativeId as narrativeId,
                    currentReach,
                    COALESCE(avgArousal, 0.0) as avgArousal
            `;

            const result = await session.run(query, { narrativeId, tenantId });

            if (result.records.length === 0) {
                return [];
            }

            const record = result.records[0];
            const currentReach = record.get('currentReach').toNumber();
            const avgArousal = record.get('avgArousal');

            // Defined thresholds
            const reachThreshold = 1000;
            const arousalThreshold = 0.75;

            const indicators: TippingPointIndicator[] = [];

            // Evaluators
            const evalReach = currentReach >= reachThreshold;
            indicators.push({
                id: uuidv4(),
                narrativeId,
                metricName: 'REACH_VOLUME',
                currentValue: currentReach,
                threshold: reachThreshold,
                isBreached: evalReach,
                breachedAt: evalReach ? new Date().toISOString() : undefined
            });

            const evalArousal = avgArousal >= arousalThreshold;
            indicators.push({
                id: uuidv4(),
                narrativeId,
                metricName: 'AUDIENCE_AROUSAL',
                currentValue: avgArousal,
                threshold: arousalThreshold,
                isBreached: evalArousal,
                breachedAt: evalArousal ? new Date().toISOString() : undefined
            });

            // If thresholds breached, we could record them back into Neo4j
            const breachedIndicators = indicators.filter(i => i.isBreached);
            if (breachedIndicators.length > 0) {
                await this.recordBreaches(breachedIndicators, session, tenantId);
            }

            return indicators;
        } catch (error) {
            logger.error({ narrativeId, error: (error as Error).message }, 'EarlyWarningService: Failed to check tipping points');
            throw error;
        } finally {
            await session.close();
        }
    }

    private async recordBreaches(indicators: TippingPointIndicator[], session: Session, tenantId?: string): Promise<void> {
        for (const indicator of indicators) {
            const query = `
                MERGE (t:TippingPointIndicator {id: $id})
                SET t.narrativeId = $narrativeId,
                    t.metricName = $metricName,
                    t.currentValue = $currentValue,
                    t.threshold = $threshold,
                    t.isBreached = $isBreached,
                    t.breachedAt = datetime($breachedAt)
                ${tenantId ? ', t.tenantId = $tenantId' : ''}
            `;
            await session.run(query, {
                ...indicator,
                tenantId
            });
        }
    }
}
