import { CIBDetectionService } from './CIBDetectionService.js';
import { NarrativeAnalysisService } from './NarrativeAnalysisService.js';
import { CrossPlatformAttributionService } from './CrossPlatformAttributionService.js';
import Neo4jGraphAnalyticsService from './GraphAnalyticsService.js';

export class InfluenceOperationsService {
  private cibService: CIBDetectionService;
  private narrativeService: NarrativeAnalysisService;
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
    this.attributionService = new CrossPlatformAttributionService();
    this.graphService = Neo4jGraphAnalyticsService.getInstance();
  }

  /**
   * Orchestrates the detection of influence operations.
   */
  async detectInfluenceOperations(campaignId: string) {
    // 1. Detect CIB (Stubbed call, usually requires entity list and data)
    // For orchestration, we might query the campaign entities first.
    // Assuming campaignId -> investigationId
    const cibResult = await this.cibService.detectCIB([], new Map(), new Map()); // Placeholder

    // 2. Analyze Narrative Evolution
    const narrativeEvolution = await this.narrativeService.takeSnapshot(campaignId);

    // 3. Calculate Influence Scores
    const influenceScores = await this.graphService.centrality({
        tenantId: 'system', // Context required
        scope: { investigationId: campaignId },
        algorithm: 'pageRank'
    });

    return {
      cib: cibResult,
      narrative: narrativeEvolution,
      influenceScores,
      timestamp: new Date()
    };
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
