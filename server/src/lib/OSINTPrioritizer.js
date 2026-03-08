"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSINTPrioritizationService = void 0;
const database_js_1 = require("../config/database.js");
const OSINTQueueService_js_1 = require("../services/OSINTQueueService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class OSINTPrioritizationService {
    driver;
    config;
    constructor(config = {}) {
        this.driver = (0, database_js_1.getNeo4jDriver)();
        this.config = {
            minDegree: config.minDegree || 2,
            maxPending: config.maxPending || 100,
            scanLimit: config.scanLimit || 50,
        };
    }
    /**
     * Scans the graph for high-priority entities that need OSINT enrichment.
     * Priority is determined by:
     * 1. Centrality (degree) - connected nodes are more important.
     * 2. Completeness - missing key properties (e.g., summary, source).
     * 3. Veracity - low or missing veracity score.
     */
    async identifyTargets(tenantId) {
        const session = this.driver.session();
        try {
            // Cypher to find nodes with high degree but missing 'veracityScore' or 'summary'
            const query = `
        MATCH (n:Entity)
        WHERE (n.veracityScore IS NULL OR n.summary IS NULL)
        ${tenantId ? 'AND n.tenantId = $tenantId' : ''}
        WITH n, size((n)--()) as degree
        WHERE degree >= $minDegree
        RETURN n.id as id, degree
        ORDER BY degree DESC
        LIMIT $scanLimit
      `;
            const result = await session.run(query, {
                minDegree: this.config.minDegree,
                scanLimit: this.config.scanLimit,
                tenantId,
            });
            return result.records.map((r) => r.get('id'));
        }
        catch (error) {
            logger_js_1.default.error('Failed to identify OSINT targets', error);
            return [];
        }
        finally {
            await session.close();
        }
    }
    /**
     * Runs a prioritization cycle: finds targets and queues them for ingestion.
     */
    async runPrioritizationCycle(tenantId) {
        logger_js_1.default.info('Starting OSINT prioritization cycle...');
        const targets = await this.identifyTargets(tenantId);
        logger_js_1.default.info(`Identified ${targets.length} targets for enrichment.`);
        for (const targetId of targets) {
            // For now, we assume we want to enrich via 'wikipedia' as a default,
            // or we could use a generic 'search' strategy.
            // We will queue a 'comprehensive_scan' job.
            await (0, OSINTQueueService_js_1.enqueueOSINT)('comprehensive_scan', targetId, { tenantId });
        }
        return targets;
    }
}
exports.OSINTPrioritizationService = OSINTPrioritizationService;
