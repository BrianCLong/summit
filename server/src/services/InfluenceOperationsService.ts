import { CIBDetectionService } from './CIBDetectionService.js';
import { NarrativeAnalysisService } from './NarrativeAnalysisService.js';
import { NarrativeForecastingService } from './NarrativeForecastingService.js';
import { CrossPlatformAttributionService } from './CrossPlatformAttributionService.js';
import Neo4jGraphAnalyticsService from './GraphAnalyticsService.js';
import { runCypher } from '../graph/neo4j.js';
import logger from '../utils/logger.js';

export class InfluenceOperationsService {
  private cibService: CIBDetectionService;
  private narrativeService: NarrativeAnalysisService;
  private forecastingService: NarrativeForecastingService;
  private attributionService: CrossPlatformAttributionService;
  private graphService: Neo4jGraphAnalyticsService;

  private static instance: InfluenceOperationsService;

  public static getInstance(): InfluenceOperationsService {
    if (!InfluenceOperationsService.instance) {
      InfluenceOperationsService.instance = new InfluenceOperationsService();
    }
    return InfluenceOperationsService.instance;
  }

  constructor() {
    this.cibService = new CIBDetectionService();
    this.narrativeService = new NarrativeAnalysisService();
    this.forecastingService = new NarrativeForecastingService();
    this.attributionService = new CrossPlatformAttributionService();
    this.graphService = Neo4jGraphAnalyticsService.getInstance();
  }

  /**
   * Orchestrates the detection of influence operations.
   */
  async detectInfluenceOperations(campaignId: string) {
    const startTime = Date.now();
    try {
      // 1. Fetch relevant entities and data for the campaign
      const entities = await this.fetchCampaignEntities(campaignId);

      // Fallback if no entities found
      if (entities.length === 0) {
        return {
          cib: { identifiedBotClusters: [], anomalies: [], precisionScore: 0, timestamp: new Date() },
          narrative: null,
          influenceScores: [],
          timestamp: new Date()
        };
      }

      const telemetry = await this.fetchBehavioralTelemetry(entities);
      const texts = await this.fetchEntityTexts(entities);

      // 2. Detect CIB (with isolated error handling)
      let cibResult;
      try {
        cibResult = await this.cibService.detectCIB(
          entities.map(e => e.id),
          telemetry,
          texts
        );
      } catch (error: any) {
        logger.error(`CIB detection failed for campaign ${campaignId}:`, error);
        cibResult = { identifiedBotClusters: [], anomalies: [], precisionScore: 0, error: error.message };
      }

      // 3. Analyze Narrative Evolution (with isolated error handling)
      let narrativeSnapshot;
      try {
        narrativeSnapshot = await this.narrativeService.takeSnapshot(campaignId);
      } catch (error: any) {
        logger.error(`Narrative analysis failed for campaign ${campaignId}:`, error);
        narrativeSnapshot = null;
      }

      // 4. Forecast Narrative Trajectory (with isolated error handling)
      let forecast;
      try {
        forecast = await this.forecastingService.forecastNarrativeTrajectory(campaignId);
      } catch (error: any) {
        logger.error(`Narrative forecasting failed for campaign ${campaignId}:`, error);
        forecast = null;
      }

      // 5. Calculate Influence Scores
      let influenceScores: any[] = [];
      try {
        influenceScores = await this.graphService.centrality({
          tenantId: 'system',
          scope: { investigationId: campaignId },
          algorithm: 'pageRank'
        });
      } catch (error: any) {
        logger.error(`Graph centrality calculation failed for campaign ${campaignId}:`, error);
      }

      // 6. Enhanced ML Analysis
      let mlInsights = null;
      try {
        mlInsights = await this.calculateMLInsights(campaignId);
      } catch (error: any) {
        logger.error(`ML insights calculation failed for campaign ${campaignId}:`, error);
      }

      const duration = Date.now() - startTime;
      logger.info({ msg: 'Influence operations detection complete', campaignId, duration });

      return {
        cib: cibResult,
        narrative: narrativeSnapshot ? {
          ...narrativeSnapshot,
          forecast
        } : null,
        influenceScores,
        mlInsights,
        timestamp: new Date()
      };
    } catch (error: any) {
      logger.error(`Critical failure in InfluenceOperationsService for campaign ${campaignId}:`, error);
      throw error; // Re-throw critical failures
    }
  }

  private async calculateMLInsights(campaignId: string): Promise<any> {
    const { advancedMLService } = await import('./AdvancedMLService.js');
    const { GNNService } = await import('./GNNService.js');

    // 1. Fetch subgraph from Neo4j
    const subgraph = await this.graphService.kHopNeighborhood({
      tenantId: 'system',
      seedIds: [], // We use the scope instead
      depth: 2
    });

    // 2. Transfrom for GNN
    const gnnData = GNNService.convertGraphData(subgraph);

    // 3. Extract features (nodes mapping to vectors)
    // In a real system, we'd have a vector DB or pre-computed embeddings.
    const nodeFeatures = Object.values(gnnData.node_features || {});
    const edgeIndex = [
      gnnData.edges.map((e: any) => e[0]),
      gnnData.edges.map((e: any) => e[1])
    ];

    if (nodeFeatures.length === 0) return null;

    // 4. Run ML Analysis
    return advancedMLService.analyzeGraphWithML(
      nodeFeatures,
      edgeIndex as any,
      'anomaly_detection'
    );
  }

  private async fetchCampaignEntities(campaignId: string): Promise<any[]> {
    const cypher = 'MATCH (n:Entity {investigationId: $campaignId}) RETURN n.id as id, n.label as label';
    try {
      return await runCypher<{ id: string, label: string }>(cypher, { campaignId });
    } catch (e) {
      return [];
    }
  }

  private async fetchBehavioralTelemetry(entities: any[]): Promise<Map<string, any[]>> {
    const telemetryMap = new Map();
    // Mocking telemetry for current demo if not in DB
    entities.forEach(e => {
      telemetryMap.set(e.id, [{ clicks: Math.random() * 80, timeInView: 60, editRate: Math.random() * 5 }]);
    });
    return telemetryMap;
  }

  private async fetchEntityTexts(entities: any[]): Promise<Map<string, string[]>> {
    const textsMap = new Map();
    const cypher = 'MATCH (n:Entity) WHERE n.id IN $ids RETURN n.id as id, n.content as content';
    try {
      const result = await runCypher<{ id: string, content: string }>(cypher, { ids: entities.map(e => e.id) });
      result.forEach(row => {
        textsMap.set(row.id, row.content ? [row.content] : []);
      });
    } catch (e) {
      // ignore
    }
    return textsMap;
  }

  async getNarrativeTimeline(narrativeId: string) {
    return this.narrativeService.getNarrativeEvolution(narrativeId);
  }

  async getInfluenceNetwork(narrativeId: string) {
    // For Influence Network, we want Centrality and Communities
    // We assume tenantId is available from context or passed.
    // Since this method signature doesn't have it, we default or should update signature.
    // For prototype, we default to 'system' or 'current'.

    const centrality = await this.graphService.centrality({
      tenantId: 'system',
      scope: { investigationId: narrativeId },
      algorithm: 'pageRank'
    });

    const communities = await this.graphService.communities({
      tenantId: 'system',
      scope: { investigationId: narrativeId },
      algorithm: 'louvain'
    });

    return { centrality, communities };
  }
}
