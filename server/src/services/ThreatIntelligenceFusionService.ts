
import OSINTAggregator from './OSINTAggregator.js';
import SecureFusionService from './SecureFusionService.js';
import { PredictiveThreatAnalyticsService } from './PredictiveThreatAnalyticsService.js';
import { AutomatedIntelligenceReportingService } from './AutomatedIntelligenceReportingService.js';
import logger from '../utils/logger.js';
import { getNeo4jDriver } from '../config/database.js';

/**
 * ThreatIntelligenceFusionService
 *
 * Central orchestrator for the "Advanced Threat Intelligence Fusion & Predictive Analytics Platform".
 * Coordinates ingestion, fusion, graph construction, prediction, and reporting.
 */
export class ThreatIntelligenceFusionService {
  private static instance: ThreatIntelligenceFusionService;

  private osintAggregator: OSINTAggregator;
  private fusionService: SecureFusionService;
  private predictiveService: PredictiveThreatAnalyticsService;
  private reportingService: AutomatedIntelligenceReportingService;
  private driver;

  private constructor() {
    this.osintAggregator = new OSINTAggregator();
    this.fusionService = new SecureFusionService();
    this.predictiveService = new PredictiveThreatAnalyticsService();
    this.reportingService = new AutomatedIntelligenceReportingService();
    this.driver = getNeo4jDriver();
  }

  public static getInstance(): ThreatIntelligenceFusionService {
    if (!ThreatIntelligenceFusionService.instance) {
      ThreatIntelligenceFusionService.instance = new ThreatIntelligenceFusionService();
    }
    return ThreatIntelligenceFusionService.instance;
  }

  /**
   * Ingest generic intelligence item.
   * Supports OSINT, Tech Intel, etc.
   */
  async ingestItem(item: any, type: 'OSINT' | 'TECH' | 'GEO' | 'FIN' = 'OSINT') {
    logger.info(`Ingesting ${type} item: ${item.title || item.id}`);

    if (type === 'OSINT') {
      return this.osintAggregator.ingest(item, item.source || 'manual');
    } else {
      // Direct fusion for other types for now
      return this.fusionService.fuse({ ...item, type });
    }
  }

  /**
   * Manually add a relationship to the Knowledge Graph.
   * e.g., "Actor X USES Malware Y"
   */
  async addRelationship(sourceId: string, targetId: string, type: string, props: any = {}) {
    if (!this.driver) {
      logger.warn('No DB driver, skipping relationship creation');
      return;
    }

    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (a {id: $sourceId}), (b {id: $targetId})
        MERGE (a)-[r:${type}]->(b)
        SET r += $props, r.updatedAt = datetime()
      `, { sourceId, targetId, props });

      logger.info(`Created relationship: ${sourceId} -[${type}]-> ${targetId}`);
    } catch (e: any) {
      logger.error('Failed to create relationship', e);
      throw e;
    } finally {
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
