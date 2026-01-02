import { DataQualityMetric } from './models.js';
import { getDriver } from '../../graph/neo4j.js';

export class DataQualityService {

  async getQualityMetrics(tenantId: string): Promise<DataQualityMetric[]> {
    const metrics: DataQualityMetric[] = [];
    const driver = getDriver();
    const session = driver.session();

    try {
        // 1. Completeness: % of entities with missing names
        const completenessResult = await session.run(`
            MATCH (n:Entity {tenantId: $tenantId})
            WITH count(n) as total,
                 count(CASE WHEN n.name IS NULL OR n.name = '' THEN 1 END) as missingName
            RETURN total, missingName
        `, { tenantId });

        if (completenessResult.records.length > 0) {
            const total = completenessResult.records[0].get('total').toNumber();
            const missing = completenessResult.records[0].get('missingName').toNumber();

            if (total > 0) {
                metrics.push({
                    metric: 'missing_name_rate',
                    value: missing / total,
                    timestamp: new Date(),
                    dimensions: { tenantId }
                });
            }
        }

        // 2. Potential Duplicates (Heuristic: Same Email)
        const duplicatesResult = await session.run(`
            MATCH (n:Entity {tenantId: $tenantId})
            WHERE n.email IS NOT NULL
            WITH n.email as email, count(*) as c
            WHERE c > 1
            RETURN sum(c) as duplicateCount
        `, { tenantId });

        if (duplicatesResult.records.length > 0) {
            const dupCount = duplicatesResult.records[0].get('duplicateCount').toNumber();
            metrics.push({
                metric: 'duplicate_email_count',
                value: dupCount,
                timestamp: new Date(),
                dimensions: { tenantId }
            });
        }

    } catch (error: any) {
        console.error('Error calculating data quality metrics:', error);
    } finally {
        await session.close();
    }

    return metrics;
  }
}
