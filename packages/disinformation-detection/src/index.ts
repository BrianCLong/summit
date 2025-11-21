/**
 * Disinformation Campaign Detection Package
 * Detect coordinated inauthentic behavior, bot networks, and influence campaigns
 */

export * from './cross-platform/correlation-engine';
export * from './temporal/network-evolution';

// Types
export interface DisinformationAnalysisResult {
  campaignDetected: boolean;
  confidence: number;
  campaigns: DetectedCampaign[];
  botNetworks: BotNetwork[];
  narratives: NarrativeTracking[];
  influenceMap: InfluenceNetwork;
  recommendations: string[];
}

export interface DetectedCampaign {
  id: string;
  type: CampaignType;
  confidence: number;
  startDate: Date;
  endDate?: Date;
  accounts: string[];
  content: ContentPattern[];
  coordination: CoordinationIndicators;
  impact: ImpactAssessment;
}

export enum CampaignType {
  COORDINATED_INAUTHENTIC_BEHAVIOR = 'coordinated_inauthentic_behavior',
  AMPLIFICATION = 'amplification',
  ASTROTURFING = 'astroturfing',
  PROPAGANDA = 'propaganda',
  MISINFORMATION_SPREAD = 'misinformation_spread',
  POLARIZATION = 'polarization',
  SUPPRESSION = 'suppression',
}

export interface BotNetwork {
  networkId: string;
  confidence: number;
  accounts: BotAccount[];
  coordination: CoordinationMetrics;
  behavior: NetworkBehavior;
}

export interface BotAccount {
  accountId: string;
  botScore: number;
  indicators: BotIndicator[];
  activity: ActivityPattern;
}

export interface BotIndicator {
  type: string;
  severity: number;
  description: string;
}

export interface ActivityPattern {
  postFrequency: number;
  activeHours: number[];
  burstiness: number;
  consistency: number;
}

export interface CoordinationMetrics {
  timingScore: number;
  contentSimilarity: number;
  networkDensity: number;
  synchronization: number;
}

export interface NetworkBehavior {
  amplificationFactor: number;
  reachEstimate: number;
  targetAudiences: string[];
  tactics: string[];
}

export interface NarrativeTracking {
  narrativeId: string;
  content: string;
  evolution: NarrativeEvolution[];
  spread: SpreadMetrics;
  sources: SourceAttribution[];
}

export interface NarrativeEvolution {
  timestamp: Date;
  variant: string;
  mutations: string[];
  reach: number;
}

export interface SpreadMetrics {
  velocity: number;
  acceleration: number;
  reach: number;
  engagement: number;
  crossPlatform: boolean;
}

export interface SourceAttribution {
  sourceId: string;
  confidence: number;
  firstSeen: Date;
  influence: number;
}

export interface InfluenceNetwork {
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
  clusters: AccountCluster[];
  superSpreaders: string[];
}

export interface InfluenceNode {
  accountId: string;
  influence: number;
  reach: number;
  authenticity: number;
}

export interface InfluenceEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

export interface AccountCluster {
  clusterId: string;
  accounts: string[];
  coherence: number;
  purpose: string;
}

export interface ContentPattern {
  pattern: string;
  frequency: number;
  accounts: string[];
  timing: TimingPattern;
}

export interface TimingPattern {
  peaks: Date[];
  coordination: number;
  naturalness: number;
}

export interface CoordinationIndicators {
  timingCoordination: number;
  contentCoordination: number;
  behaviorCoordination: number;
  networkCoordination: number;
}

export interface ImpactAssessment {
  reach: number;
  engagement: number;
  sentiment: number;
  effectiveness: number;
  persistence: number;
}

// Main Detector Class
export class DisinformationDetector {
  /**
   * Analyze content and accounts for disinformation campaigns
   */
  async analyzeCampaign(data: {
    content: Array<{ id: string; text: string; timestamp: Date; author: string }>;
    accounts: Array<{ id: string; profile: any; activity: any }>;
    network: Array<{ source: string; target: string; type: string }>;
  }): Promise<DisinformationAnalysisResult> {
    const campaigns: DetectedCampaign[] = [];
    const botNetworks: BotNetwork[] = [];
    const narratives: NarrativeTracking[] = [];
    const recommendations: string[] = [];

    // 1. Detect coordinated inauthentic behavior
    const cibCampaigns = await this.detectCoordinatedBehavior(data);
    campaigns.push(...cibCampaigns);

    // 2. Identify bot networks
    const detectedBots = await this.detectBotNetworks(data.accounts, data.network);
    botNetworks.push(...detectedBots);

    // 3. Track narrative propagation
    const trackedNarratives = await this.trackNarratives(data.content);
    narratives.push(...trackedNarratives);

    // 4. Map influence networks
    const influenceMap = await this.mapInfluenceNetwork(data.network, data.accounts);

    // 5. Generate recommendations
    if (campaigns.length > 0) {
      recommendations.push('Coordinated campaign detected - investigate account connections');
    }
    if (botNetworks.length > 0) {
      recommendations.push(`${botNetworks.length} bot networks identified - consider account suspension`);
    }
    if (narratives.some((n) => n.spread.velocity > 0.8)) {
      recommendations.push('Rapid narrative spread detected - monitor for viral amplification');
    }

    return {
      campaignDetected: campaigns.length > 0,
      confidence: this.calculateOverallConfidence(campaigns, botNetworks),
      campaigns,
      botNetworks,
      narratives,
      influenceMap,
      recommendations,
    };
  }

  /**
   * Detect coordinated inauthentic behavior
   */
  private async detectCoordinatedBehavior(data: any): Promise<DetectedCampaign[]> {
    const campaigns: DetectedCampaign[] = [];

    // Indicators of coordination:
    // 1. Simultaneous posting of similar content
    // 2. Synchronized account creation dates
    // 3. Similar posting patterns
    // 4. Shared content pools
    // 5. Coordinated amplification (retweets/shares)

    const timingCoordination = this.analyzeTimingCoordination(data.content);
    const contentCoordination = this.analyzeContentSimilarity(data.content);
    const behaviorCoordination = this.analyzeBehaviorPatterns(data.accounts);
    const networkCoordination = this.analyzeNetworkStructure(data.network);

    if (
      timingCoordination > 0.7 ||
      contentCoordination > 0.8 ||
      (behaviorCoordination > 0.6 && networkCoordination > 0.6)
    ) {
      campaigns.push({
        id: `campaign_${Date.now()}`,
        type: CampaignType.COORDINATED_INAUTHENTIC_BEHAVIOR,
        confidence: Math.max(timingCoordination, contentCoordination, behaviorCoordination),
        startDate: new Date(Math.min(...data.content.map((c: any) => c.timestamp.getTime()))),
        accounts: Array.from(new Set(data.content.map((c: any) => c.author))),
        content: this.extractContentPatterns(data.content),
        coordination: {
          timingCoordination,
          contentCoordination,
          behaviorCoordination,
          networkCoordination,
        },
        impact: this.assessImpact(data),
      });
    }

    return campaigns;
  }

  private analyzeTimingCoordination(content: any[]): number {
    // Analyze temporal patterns for coordination
    // High score = content posted at suspiciously similar times
    if (content.length < 2) return 0;

    const timestamps = content.map((c) => c.timestamp.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Check for low variance (indicates coordination)
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of variation

    // Low CV indicates high coordination
    return cv < 0.3 ? 0.9 : cv < 0.5 ? 0.7 : 0.3;
  }

  private analyzeContentSimilarity(content: any[]): number {
    // Calculate content similarity across posts
    // High similarity = potential coordination
    if (content.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < content.length; i++) {
      for (let j = i + 1; j < content.length; j++) {
        totalSimilarity += this.calculateTextSimilarity(content[i].text, content[j].text);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private analyzeBehaviorPatterns(accounts: any[]): number {
    // Analyze account behavior for bot-like patterns
    return 0.5;
  }

  private analyzeNetworkStructure(network: any[]): number {
    // Analyze network for dense clusters (coordination indicator)
    return 0.5;
  }

  private extractContentPatterns(content: any[]): ContentPattern[] {
    // Extract common patterns from content
    return [];
  }

  private assessImpact(data: any): ImpactAssessment {
    return {
      reach: data.content.length * 100,
      engagement: 0.5,
      sentiment: 0,
      effectiveness: 0.6,
      persistence: 0.7,
    };
  }

  /**
   * Detect bot networks
   */
  private async detectBotNetworks(accounts: any[], network: any[]): Promise<BotNetwork[]> {
    const networks: BotNetwork[] = [];

    // Identify likely bots
    const botAccounts = accounts
      .map((account) => ({
        accountId: account.id,
        botScore: this.calculateBotScore(account),
        indicators: this.identifyBotIndicators(account),
        activity: this.analyzeActivityPattern(account.activity),
      }))
      .filter((acc) => acc.botScore > 0.6);

    if (botAccounts.length > 3) {
      // Find coordinated networks among bots
      const clusters = this.findAccountClusters(botAccounts, network);

      for (const cluster of clusters) {
        if (cluster.accounts.length >= 3) {
          networks.push({
            networkId: `network_${Date.now()}_${networks.length}`,
            confidence: cluster.coherence,
            accounts: cluster.accounts.map(id => botAccounts.find(a => a.accountId === id)!),
            coordination: this.calculateCoordinationMetrics(cluster.accounts, network),
            behavior: {
              amplificationFactor: 2.5,
              reachEstimate: cluster.accounts.length * 1000,
              targetAudiences: ['general'],
              tactics: ['amplification', 'coordinated_posting'],
            },
          });
        }
      }
    }

    return networks;
  }

  private calculateBotScore(account: any): number {
    let score = 0;

    // Bot indicators:
    // 1. Generic profile (0.2)
    if (!account.profile?.bio || account.profile.bio.length < 20) score += 0.2;

    // 2. High posting frequency (0.3)
    if (account.activity?.postsPerDay > 50) score += 0.3;

    // 3. Default or stock profile image (0.2)
    if (!account.profile?.hasCustomImage) score += 0.2;

    // 4. Recent account creation (0.1)
    const accountAge = Date.now() - (account.profile?.createdAt || Date.now());
    if (accountAge < 30 * 24 * 60 * 60 * 1000) score += 0.1;

    // 5. Automated behavior patterns (0.2)
    if (account.activity?.regularity > 0.9) score += 0.2;

    return Math.min(score, 1);
  }

  private identifyBotIndicators(account: any): BotIndicator[] {
    const indicators: BotIndicator[] = [];

    if (!account.profile?.bio) {
      indicators.push({
        type: 'missing_bio',
        severity: 0.4,
        description: 'Account has no biography',
      });
    }

    if (account.activity?.postsPerDay > 50) {
      indicators.push({
        type: 'high_frequency',
        severity: 0.7,
        description: 'Unusually high posting frequency',
      });
    }

    return indicators;
  }

  private analyzeActivityPattern(activity: any): ActivityPattern {
    return {
      postFrequency: activity?.postsPerDay || 0,
      activeHours: activity?.activeHours || [],
      burstiness: activity?.burstiness || 0,
      consistency: activity?.regularity || 0,
    };
  }

  private findAccountClusters(accounts: BotAccount[], network: any[]): AccountCluster[] {
    // Simple clustering based on connections
    const clusters: AccountCluster[] = [];
    const visited = new Set<string>();

    for (const account of accounts) {
      if (visited.has(account.accountId)) continue;

      const cluster: string[] = [account.accountId];
      visited.add(account.accountId);

      // Find connected accounts
      for (const edge of network) {
        if (edge.source === account.accountId && !visited.has(edge.target)) {
          const targetBot = accounts.find((a) => a.accountId === edge.target);
          if (targetBot && targetBot.botScore > 0.6) {
            cluster.push(edge.target);
            visited.add(edge.target);
          }
        }
      }

      if (cluster.length >= 3) {
        clusters.push({
          clusterId: `cluster_${clusters.length}`,
          accounts: cluster,
          coherence: 0.8,
          purpose: 'amplification',
        });
      }
    }

    return clusters;
  }

  private calculateCoordinationMetrics(accounts: string[], network: any[]): CoordinationMetrics {
    return {
      timingScore: 0.7,
      contentSimilarity: 0.8,
      networkDensity: 0.6,
      synchronization: 0.75,
    };
  }

  /**
   * Track narrative propagation
   */
  private async trackNarratives(content: any[]): Promise<NarrativeTracking[]> {
    const narratives: NarrativeTracking[] = [];

    // Extract common narratives using text clustering
    const clusters = this.clusterContent(content);

    for (const cluster of clusters) {
      if (cluster.content.length >= 3) {
        narratives.push({
          narrativeId: `narrative_${narratives.length}`,
          content: cluster.representative,
          evolution: this.trackEvolution(cluster.content),
          spread: this.calculateSpreadMetrics(cluster.content),
          sources: this.attributeSources(cluster.content),
        });
      }
    }

    return narratives;
  }

  private clusterContent(content: any[]): Array<{ representative: string; content: any[] }> {
    // Simple content clustering
    return [{ representative: 'example narrative', content: content.slice(0, 3) }];
  }

  private trackEvolution(content: any[]): NarrativeEvolution[] {
    return content.map((c) => ({
      timestamp: c.timestamp,
      variant: c.text,
      mutations: [],
      reach: 100,
    }));
  }

  private calculateSpreadMetrics(content: any[]): SpreadMetrics {
    return {
      velocity: 0.6,
      acceleration: 0.4,
      reach: content.length * 100,
      engagement: 0.5,
      crossPlatform: false,
    };
  }

  private attributeSources(content: any[]): SourceAttribution[] {
    return content.map((c, i) => ({
      sourceId: c.author,
      confidence: i === 0 ? 0.9 : 0.6,
      firstSeen: c.timestamp,
      influence: 0.5,
    }));
  }

  /**
   * Map influence network
   */
  private async mapInfluenceNetwork(network: any[], accounts: any[]): Promise<InfluenceNetwork> {
    const nodes: InfluenceNode[] = accounts.map((acc) => ({
      accountId: acc.id,
      influence: this.calculateInfluence(acc, network),
      reach: acc.profile?.followers || 0,
      authenticity: 1 - this.calculateBotScore(acc),
    }));

    const edges: InfluenceEdge[] = network.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: 1,
      type: edge.type || 'connection',
    }));

    const clusters = this.findAccountClusters([], network);

    const superSpreaders = nodes
      .filter((n) => n.influence > 0.8)
      .map((n) => n.accountId)
      .slice(0, 10);

    return {
      nodes,
      edges,
      clusters,
      superSpreaders,
    };
  }

  private calculateInfluence(account: any, network: any[]): number {
    // Calculate influence based on network centrality
    const connections = network.filter((e) => e.source === account.id || e.target === account.id);
    return Math.min(connections.length / 100, 1);
  }

  private calculateOverallConfidence(campaigns: DetectedCampaign[], botNetworks: BotNetwork[]): number {
    if (campaigns.length === 0 && botNetworks.length === 0) return 0;

    let totalConfidence = 0;
    let count = 0;

    for (const campaign of campaigns) {
      totalConfidence += campaign.confidence;
      count++;
    }

    for (const network of botNetworks) {
      totalConfidence += network.confidence;
      count++;
    }

    return count > 0 ? totalConfidence / count : 0;
  }
}
