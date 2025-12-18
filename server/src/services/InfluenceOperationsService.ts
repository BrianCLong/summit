import { CIBDetectionService } from './CIBDetectionService.js';
import { NarrativeAnalysisService } from './NarrativeAnalysisService.js';
import { CrossPlatformAttributionService } from './CrossPlatformAttributionService.js';
// @ts-ignore
import GraphAnalyticsService from './GraphAnalyticsService.js';

export class InfluenceOperationsService {
  private cibService: CIBDetectionService;
  private narrativeService: NarrativeAnalysisService;
  private attributionService: CrossPlatformAttributionService;
  private graphService: any; // GraphAnalyticsService

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
    this.graphService = new GraphAnalyticsService();
  }

  /**
   * Orchestrates the detection of influence operations.
   */
  async detectInfluenceOperations(campaignId: string) {
    // 1. Detect CIB
    const cibResult = await this.cibService.detectCIB([], new Map()); // Pass real data

    // 2. Analyze Narrative Evolution
    const narrativeEvolution = await this.narrativeService.takeSnapshot(campaignId);

    // 3. Calculate Influence Scores (PageRank)
    const influenceScores = await this.graphService.calculatePageRank(campaignId);

    // 4. Cross-Platform Attribution (if entities identified)
    // const attribution = await this.attributionService.unifyIdentities(...);

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
    const centrality = await this.graphService.calculateCentralityMeasures(narrativeId);
    const communities = await this.graphService.detectCommunities(narrativeId);
    return { centrality, communities };
  }
}
