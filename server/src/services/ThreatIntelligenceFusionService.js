"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatIntelligenceFusionService = void 0;
const OSINTAggregator_js_1 = __importDefault(require("./OSINTAggregator.js"));
const SecureFusionService_js_1 = __importDefault(require("./SecureFusionService.js"));
const PredictiveThreatAnalyticsService_js_1 = require("./PredictiveThreatAnalyticsService.js");
const AutomatedIntelligenceReportingService_js_1 = require("./AutomatedIntelligenceReportingService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const database_js_1 = require("../config/database.js");
/**
 * ThreatIntelligenceFusionService
 *
 * Central orchestrator for the "Advanced Threat Intelligence Fusion & Predictive Analytics Platform".
 * Coordinates ingestion, fusion, graph construction, prediction, and reporting.
 */
class ThreatIntelligenceFusionService {
    static instance;
    osintAggregator;
    fusionService;
    predictiveService;
    reportingService;
    driver;
    constructor() {
        this.osintAggregator = new OSINTAggregator_js_1.default();
        this.fusionService = new SecureFusionService_js_1.default();
        this.predictiveService = new PredictiveThreatAnalyticsService_js_1.PredictiveThreatAnalyticsService();
        this.reportingService = new AutomatedIntelligenceReportingService_js_1.AutomatedIntelligenceReportingService();
        this.driver = (0, database_js_1.getNeo4jDriver)();
    }
    static getInstance() {
        if (!ThreatIntelligenceFusionService.instance) {
            ThreatIntelligenceFusionService.instance = new ThreatIntelligenceFusionService();
        }
        return ThreatIntelligenceFusionService.instance;
    }
    /**
     * Ingest generic intelligence item.
     * Supports OSINT, Tech Intel, etc.
     */
    async ingestItem(item, type = 'OSINT') {
        logger_js_1.default.info(`Ingesting ${type} item: ${item.title || item.id}`);
        if (type === 'OSINT') {
            return this.osintAggregator.ingest(item, item.source || 'manual');
        }
        else {
            // Direct fusion for other types for now
            return this.fusionService.fuse({ ...item, type });
        }
    }
    /**
     * Manually add a relationship to the Knowledge Graph.
     * e.g., "Actor X USES Malware Y"
     */
    async addRelationship(sourceId, targetId, type, props = {}) {
        if (!this.driver) {
            logger_js_1.default.warn('No DB driver, skipping relationship creation');
            return;
        }
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (a {id: $sourceId}), (b {id: $targetId})
        MERGE (a)-[r:${type}]->(b)
        SET r += $props, r.updatedAt = datetime()
      `, { sourceId, targetId, props });
            logger_js_1.default.info(`Created relationship: ${sourceId} -[${type}]-> ${targetId}`);
        }
        catch (e) {
            logger_js_1.default.error('Failed to create relationship', e);
            throw e;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Generates the data required for the "Interactive Intelligence Dashboard".
     */
    async getDashboardData() {
        // 1. Get Strategic Warning
        const strategicWarning = await this.predictiveService.assessStrategicWarning();
        // 2. Get Recent Fused Entities (Simulated query)
        // In production, query Neo4j for recently created/updated nodes
        const recentThreats = [
            { id: '1', name: 'APT-29 Activity', severity: 'high', detectedAt: new Date().toISOString() },
            { id: '2', name: 'Log4Shell Variant', severity: 'critical', detectedAt: new Date().toISOString(), cvss: 9.8 }
        ];
        // 3. Get Forecasts for Key Metrics
        const forecast = await this.predictiveService.forecast('threat_mentions', 7);
        // 4. Queue Stats
        const ingestionStats = this.osintAggregator.getStats();
        return {
            strategicWarning,
            recentThreats,
            forecast,
            ingestionStats,
            generatedAt: new Date()
        };
    }
    /**
     * Generates a full briefing.
     */
    async generateBriefing() {
        const data = await this.getDashboardData();
        return this.reportingService.generateDailyBriefing({
            strategicWarning: data.strategicWarning,
            recentThreats: data.recentThreats
        });
    }
}
exports.ThreatIntelligenceFusionService = ThreatIntelligenceFusionService;
