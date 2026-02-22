import fs from 'fs';
import path from 'path';
import { Cohort, CohortEvaluationResult, CohortMember } from './types.ts';
import { TelemetryEvent } from '../telemetry/types.ts';

// Helper to read logs - reusing the structure from TelemetryService
// In production, this would query a DB or OLAP store (ClickHouse, Snowflake, etc.)
// For this MVP, we scan the JSONL log files.

export class CohortEvaluator {
    private logDir: string;
    private cache: Map<string, CohortEvaluationResult> = new Map();

    constructor(logDir: string) {
        this.logDir = logDir;
    }

    public evaluate(cohort: Cohort): CohortEvaluationResult {
        // Check cache (naive in-memory for MVP)
        // Ideally verify TTL
        if (this.cache.has(cohort.id)) {
            return this.cache.get(cohort.id)!;
        }

        const members = this.scanLogs(cohort);

        const result: CohortEvaluationResult = {
            cohortId: cohort.id,
            timestamp: new Date().toISOString(),
            members,
            totalCount: members.length
        };

        this.cache.set(cohort.id, result);
        return result;
    }

    private scanLogs(cohort: Cohort): CohortMember[] {
        if (!fs.existsSync(this.logDir)) {
            return [];
        }

        const files = fs.readdirSync(this.logDir).filter((f: string) => f.endsWith('.tsonl'));
        // In real impl, filter files by date window (cohort.windowDays)

        const aggregates = new Map<string, number>(); // key: tenantHash:userHash, val: metric

        for (const file of files) {
            const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event: TelemetryEvent = JSON.parse(line);
                    if (event.eventType === cohort.criteria.eventType) {
                        const key = `${event.tenantIdHash}:${event.scopeHash}`;
                        const current = aggregates.get(key) || 0;
                        aggregates.set(key, current + 1);
                    }
                } catch (e: any) {
                    // ignore malformed lines
                }
            }
        }

        const members: CohortMember[] = [];
        for (const [key, value] of aggregates.entries()) {
            if (this.checkCriteria(value, cohort.criteria.operator, cohort.criteria.value)) {
                const [hashedTenantId, hashedUserId] = key.split(':');
                members.push({
                    hashedTenantId,
                    hashedUserId,
                    metricValue: value
                });
            }
        }

        return members;
    }

    private checkCriteria(actual: number, op: string, target: number): boolean {
        switch (op) {
            case 'gt': return actual > target;
            case 'lt': return actual < target;
            case 'eq': return actual === target;
            default: return false;
        }
    }
}
