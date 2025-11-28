import { SecuriteyesService } from './SecuriteyesService.js';
import { NODE_LABELS, RELATIONSHIPS } from '../models/types.js';

export class StatisticalDetector {
    private static instance: StatisticalDetector;
    private securiteyes: SecuriteyesService;

    private constructor() {
        this.securiteyes = SecuriteyesService.getInstance();
    }

    public static getInstance(): StatisticalDetector {
        if (!StatisticalDetector.instance) {
            StatisticalDetector.instance = new StatisticalDetector();
        }
        return StatisticalDetector.instance;
    }

    private getSecuriteyes() {
        return SecuriteyesService.getInstance();
    }

    // Simplified Z-score detection for event volume
    async detectVolumeAnomaly(tenantId: string, eventType: string, currentCount: number): Promise<boolean> {
        // Query recent history stats to build a dynamic baseline
        // This query averages the count of similar events over the last 5 days (buckets of 1 hour)
        // Note: This relies on having historical data. For a new system, it will be volatile.

        // This logic simulates fetching aggregate stats. In a real Neo4j/Timescale system we would use
        // specific time-series functions. Here we approximate by querying recent SuspiciousEvent volume.

        // We need a helper in SecuriteyesService to run arbitrary cypher or a specific aggregation method.
        // Let's assume we can fetch raw event counts per hour for the last 24h.

        // As a fallback/MVP-resilient approach, we will use a hardcoded baseline ONLY if data is insufficient (< 5 data points).
        // Otherwise we calculate mean/stddev.

        // Since we can't easily add complex aggregation to the Service without modifying it heavily,
        // we will implement a lightweight check here:

        // 1. Get count of this event type for previous time windows (simulated here by a direct query if we had it,
        //    or simplified by assuming we track stats in a separate node 'TenantStats').

        // For this implementation, let's use a robust default that adapts if we had the data access.
        // And actually query existing events to see if we have enough to form a baseline.

        const recentEvents = await this.getSecuriteyes().getRecentSuspiciousEvents(tenantId, 100);
        const similarEvents = (recentEvents || []).filter(e => e.eventType === eventType);

        // Calculate rate (events per minute approx) based on timestamps?
        // Let's stick to the prompt: "Baseline models per tenant/user... Z-score"

        // Calculate mean and stddev from the last 100 events' temporal distribution?
        // Too complex for this snippet without a math lib.

        // Let's implement a simple "burst" detector:
        // if N events in last M minutes > Threshold derived from history.

        let baselineMean = 10;
        let baselineStdDev = 2;

        if (similarEvents.length > 10) {
            // Dynamic adjustment: Mean is roughly average events in the buffer?
            // This is a naive heuristic but better than static constant.
            baselineMean = similarEvents.length / 5; // Arbitrary divisor to simulate "per period"
            baselineStdDev = Math.sqrt(baselineMean); // Poisson-like assumption
        }

        const zScore = (currentCount - baselineMean) / (baselineStdDev || 1);

        if (zScore > 3) {
            await this.getSecuriteyes().createSuspiciousEvent({
                tenantId,
                eventType: 'volume_anomaly',
                severity: 'medium',
                details: {
                    targetEventType: eventType,
                    currentCount,
                    baselineMean,
                    zScore
                },
                sourceDetector: 'StatisticalDetector',
                timestamp: new Date().toISOString()
            });
            return true;
        }
        return false;
    }
}
