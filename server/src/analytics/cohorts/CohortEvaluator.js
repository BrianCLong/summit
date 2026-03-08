"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohortEvaluator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Helper to read logs - reusing the structure from TelemetryService
// In production, this would query a DB or OLAP store (ClickHouse, Snowflake, etc.)
// For this MVP, we scan the JSONL log files.
class CohortEvaluator {
    logDir;
    cache = new Map();
    constructor(logDir) {
        this.logDir = logDir;
    }
    evaluate(cohort) {
        // Check cache (naive in-memory for MVP)
        // Ideally verify TTL
        if (this.cache.has(cohort.id)) {
            return this.cache.get(cohort.id);
        }
        const members = this.scanLogs(cohort);
        const result = {
            cohortId: cohort.id,
            timestamp: new Date().toISOString(),
            members,
            totalCount: members.length
        };
        this.cache.set(cohort.id, result);
        return result;
    }
    scanLogs(cohort) {
        if (!fs_1.default.existsSync(this.logDir)) {
            return [];
        }
        const files = fs_1.default.readdirSync(this.logDir).filter((f) => f.endsWith('.jsonl'));
        // In real impl, filter files by date window (cohort.windowDays)
        const aggregates = new Map(); // key: tenantHash:userHash, val: metric
        for (const file of files) {
            const content = fs_1.default.readFileSync(path_1.default.join(this.logDir, file), 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const event = JSON.parse(line);
                    if (event.eventType === cohort.criteria.eventType) {
                        const key = `${event.tenantIdHash}:${event.scopeHash}`;
                        const current = aggregates.get(key) || 0;
                        aggregates.set(key, current + 1);
                    }
                }
                catch (e) {
                    // ignore malformed lines
                }
            }
        }
        const members = [];
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
    checkCriteria(actual, op, target) {
        switch (op) {
            case 'gt': return actual > target;
            case 'lt': return actual < target;
            case 'eq': return actual === target;
            default: return false;
        }
    }
}
exports.CohortEvaluator = CohortEvaluator;
